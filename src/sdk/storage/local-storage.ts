import {
  IStorage,
  PaginatedMessages,
  PaginatedSummaries,
  PaginatedConversations,
} from './i-storage';
import { ChatMessage } from '@/types';
import { EventBus } from '../events';
import { UUID } from 'crypto';
import {
  Summary,
  SummaryCreateRequest,
  ServerModelInfo,
  Conversation,
  ConversationUpdateRequest,
} from '@/sdk/client/types';
import { createMessage, CustomizedPromptsData, MessageSyncState, Role } from "@/types/chat";
import { EncryptionService } from '../EncryptionService';

// IndexedDB configuration
const DB_NAME = 'PandaChatDB';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';
const SUMMARIES_STORE = 'summaries';
const METADATA_STORE = 'metadata';
const FILES_STORE = 'files';
const CUSTOMIZED_PROMPTS_STORE = 'customized_prompts';

export class LocalStorage implements IStorage {
  private db: IDBDatabase | null = null;
  private bus: EventBus;
  private encryptionService: EncryptionService;
  private models: ServerModelInfo[] = [];

  constructor(
    bus: EventBus,
    encryptionService: EncryptionService,
  ) {
    this.bus = bus;
    this.encryptionService = encryptionService;
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Conversations store
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, {
            keyPath: 'conversation_id',
          });
          conversationsStore.createIndex('created_at', 'created_at', { unique: false });
          conversationsStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, {
            keyPath: 'message_id',
          });
          messagesStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('conversation_timestamp', ['conversation_id', 'timestamp'], { unique: false });
        }

        // Files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, {
            keyPath: ['conversation_id', 'file_id'],
          });
        }

        // Customized prompts store
        if (!db.objectStoreNames.contains(CUSTOMIZED_PROMPTS_STORE)) {
          db.createObjectStore(CUSTOMIZED_PROMPTS_STORE, { keyPath: 'id' });
        }

        // Summaries store
        if (!db.objectStoreNames.contains(SUMMARIES_STORE)) {
          const summariesStore = db.createObjectStore(SUMMARIES_STORE, {
            keyPath: 'summary_id',
          });
          summariesStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          summariesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Metadata store for various app-level data
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /* Chats */
  async listChats(cursor?: string, limit: number = 20): Promise<PaginatedConversations> {
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('updated_at');

    return new Promise((resolve, reject) => {
      const conversations: Conversation[] = [];
      let count = 0;
      let hasMore = false;
      let nextCursor: string | null = null;

      // Open cursor in descending order (newest first)
      const request = index.openCursor(null, 'prev');

      let shouldStart = !cursor;
      let foundStart = false;

      request.onsuccess = () => {
        const cursorResult = request.result;

        if (!cursorResult) {
          // End of data
          resolve({
            conversations: conversations.map(conv => ({
              ...conv,
              conversation_id: conv.conversation_id as UUID,
            })),
            hasMore,
            nextCursor,
          });
          return;
        }

        const conversation = cursorResult.value as Conversation;

        // If we have a cursor, skip until we find the starting point
        if (cursor && !foundStart) {
          if (conversation.conversation_id === cursor) {
            foundStart = true;
          }
          cursorResult.continue();
          return;
        }

        if (!shouldStart && !foundStart) {
          cursorResult.continue();
          return;
        }

        shouldStart = true;

        if (count < limit) {
          conversations.push(conversation);
          count++;
        } else {
          hasMore = true;
          nextCursor = conversation.conversation_id;
          resolve({
            conversations: conversations.map(conv => ({
              ...conv,
              conversation_id: conv.conversation_id as UUID,
            })),
            hasMore,
            nextCursor,
          });
          return;
        }

        cursorResult.continue();
      };

      request.onerror = () => {
        reject(new Error('Failed to list conversations'));
      };
    });
  }

  async getChat(id: string): Promise<Conversation | undefined> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
      const store = transaction.objectStore(CONVERSATIONS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
          const conversation = request.result as Conversation | undefined;
          if (conversation) {
            resolve({
              ...conversation,
              conversation_id: conversation.conversation_id as UUID,
            });
          } else {
            resolve(undefined);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to get conversation ${id}`));
        };
      });
    } catch (error) {
      console.error(`[LocalStorage] Failed to get chat ${id}:`, error);
      return undefined;
    }
  }

  async createChat(
    title: string,
    customData?: Record<string, any>,
  ): Promise<Conversation> {
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    const now = new Date().toISOString();
    const conversationId = crypto.randomUUID();
    const encryptedTitle = await this.encryptionService.encrypt(title.trim());

    const conversation: Conversation = {
      conversation_id: conversationId as UUID,
      title: encryptedTitle,
      created_at: now,
      updated_at: now,
      custom_data: customData,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(conversation);

      request.onsuccess = () => {
        resolve({
          ...conversation,
          conversation_id: conversationId as UUID,
        });
      };

      request.onerror = () => {
        reject(new Error('Failed to create conversation'));
      };
    });
  }

  async updateChat(
    chatId: string,
    data: Partial<ConversationUpdateRequest>,
  ): Promise<void> {
    console.log(`[LocalStorage] Updating chat ${chatId} with data:`, data);
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const conversation = getRequest.result as Conversation;
        if (!conversation) {
          reject(new Error(`Conversation ${chatId} not found`));
          return;
        }

        const updatedConversation: Conversation = {
          ...conversation,
          title: data.title || conversation.title,
          custom_data: data.custom_data !== undefined ? data.custom_data : conversation.custom_data,
          updated_at: new Date().toISOString(),
        };

        const putRequest = store.put(updatedConversation);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update conversation'));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get conversation for update'));
      };
    });
  }

  async deleteChat(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE, SUMMARIES_STORE, FILES_STORE], 'readwrite');
    const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const summariesStore = transaction.objectStore(SUMMARIES_STORE);
    const filesStore = transaction.objectStore(FILES_STORE);

    return new Promise((resolve, reject) => {
      // Delete the conversation
      const deleteConvRequest = conversationsStore.delete(id);

      // Delete all messages for this conversation
      const messagesIndex = messagesStore.index('conversation_id');
      const deleteMessagesRequest = messagesIndex.openCursor(IDBKeyRange.only(id));

      deleteMessagesRequest.onsuccess = () => {
        const cursor = deleteMessagesRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete all files for this conversation
      const fileRange = IDBKeyRange.bound([id, ''], [id, '\uffff']);
      const deleteFilesRequest = filesStore.openCursor(fileRange);
      deleteFilesRequest.onsuccess = () => {
        const cursor = deleteFilesRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete all summaries for this conversation
      const summariesIndex = summariesStore.index('conversation_id');
      const deleteSummariesRequest = summariesIndex.openCursor(IDBKeyRange.only(id));

      deleteSummariesRequest.onsuccess = () => {
        const cursor = deleteSummariesRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to delete conversation'));
      };
    });
  }

  async deleteAllChats(): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE, SUMMARIES_STORE, FILES_STORE], 'readwrite');
    const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const summariesStore = transaction.objectStore(SUMMARIES_STORE);
    const filesStore = transaction.objectStore(FILES_STORE);

    return new Promise((resolve, reject) => {
      conversationsStore.clear();
      messagesStore.clear();
      summariesStore.clear();
      filesStore.clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to delete all chats'));
      };
    });
  }

  /* Messages */
  async listMessages(
    chatId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedMessages> {
    const db = await this.initDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('conversation_timestamp');

    return new Promise((resolve, reject) => {
      const messages: any[] = [];
      let count = 0;
      let hasMore = false;
      let nextCursor: string | null = null;

      // Create a range for this conversation
      const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
      const request = index.openCursor(range, 'prev'); // Newest first

      let shouldStart = !cursor;
      let foundStart = false;

      request.onsuccess = async () => {
        const cursorResult = request.result;

        if (!cursorResult) {
          // End of data - reverse messages to get chronological order
          const chatMessages = await Promise.all(messages.reverse().map(msg => this.mapStoredMessageToChatMessage(msg)));
          resolve({
            messages: chatMessages,
            hasMore,
            nextCursor,
          });
          return;
        }

        const message = cursorResult.value;

        // If we have a cursor, skip until we find the starting point
        if (cursor && !foundStart) {
          if (message.message_id === cursor) {
            foundStart = true;
          }
          cursorResult.continue();
          return;
        }

        if (!shouldStart && !foundStart) {
          cursorResult.continue();
          return;
        }

        shouldStart = true;

        if (count < limit) {
          messages.push(message);
          count++;
        } else {
          hasMore = true;
          nextCursor = message.message_id;
          const chatMessages = await Promise.all(messages.reverse().map(msg => this.mapStoredMessageToChatMessage(msg)));
          resolve({
            messages: chatMessages,
            hasMore,
            nextCursor,
          });
          return;
        }

        cursorResult.continue();
      };

      request.onerror = () => {
        reject(new Error('Failed to list messages'));
      };
    });
  }

  async saveMessage(chatId: string, msg: ChatMessage): Promise<void> {
    console.log(`[LocalStorage] Saving message ${msg.id} to chat ${chatId}`);
    const db = await this.initDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    // Storing in a format similar to the API for consistency
    const messageToStore = {
      message_id: msg.id,
      conversation_id: chatId,
      sender_type: msg.role,
      content: msg.content, // Already encrypted
      files: msg.files,
      timestamp: msg.date.toISOString(),
      reasoning_content: msg.reasoning,
      reasoning_time: msg.reasoningTime?.toString(),
      custom_data: { 
        useSearch: msg.useSearch,
        processEvents: msg.processEvents || []
      },
      is_error: msg.isError,
      error_message: msg.errorMessage,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(messageToStore);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save message'));
      };
    });
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(messageId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete message'));
      };
    });
  }

  async deleteMessages(chatId: string, messageIds: string[]): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = messageIds.length;

      if (total === 0) {
        resolve();
        return;
      }

      for (const messageId of messageIds) {
        const request = store.delete(messageId);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to delete message ${messageId}`));
        };
      }
    });
  }

  /* Summaries */
  async getSummaries(chatId: string): Promise<Summary[]> {
    const db = await this.initDB();
    const transaction = db.transaction([SUMMARIES_STORE], 'readonly');
    const store = transaction.objectStore(SUMMARIES_STORE);
    const index = store.index('conversation_id');

    return new Promise((resolve, reject) => {
      const summaries: Summary[] = [];
      const request = index.openCursor(IDBKeyRange.only(chatId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          summaries.push(cursor.value as Summary);
          cursor.continue();
        } else {
          resolve(summaries.map(summary => ({
            ...summary,
            summary_id: summary.summary_id as UUID,
            conversation_id: summary.conversation_id as UUID,
            start_message_id: summary.start_message_id as UUID,
            end_message_id: summary.end_message_id as UUID,
          })));
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get summaries'));
      };
    });
  }

  async saveSummary(chatId: string, summary: SummaryCreateRequest): Promise<Summary> {
    const db = await this.initDB();
    const transaction = db.transaction([SUMMARIES_STORE], 'readwrite');
    const store = transaction.objectStore(SUMMARIES_STORE);

    const now = new Date().toISOString();
    const summaryId = crypto.randomUUID();

    const localSummary: Summary = {
      summary_id: summaryId as UUID,
      conversation_id: chatId as UUID,
      start_message_id: summary.start_message_id as UUID,
      end_message_id: summary.end_message_id as UUID,
      content: summary.content,
      created_at: now,
      updated_at: now,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(localSummary);

      request.onsuccess = () => {
        resolve({
          ...localSummary,
          summary_id: summaryId as UUID,
          conversation_id: chatId as UUID,
          start_message_id: summary.start_message_id,
          end_message_id: summary.end_message_id,
        });
      };

      request.onerror = () => {
        reject(new Error('Failed to save summary'));
      };
    });
  }

  async deleteSummary(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([SUMMARIES_STORE], 'readwrite');
    const store = transaction.objectStore(SUMMARIES_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete summary'));
      };
    });
  }

  /* Files */
  async getFile(conversationId: UUID, fileId: UUID): Promise<File> {
    const db = await this.initDB();
    const transaction = db.transaction([FILES_STORE], 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    return new Promise((resolve, reject) => {
      const request = store.get([conversationId, fileId]);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.file);
        } else {
          reject(new Error(`File ${fileId} not found in conversation ${conversationId}`));
        }
      };
      request.onerror = () => {
        reject(new Error(`Failed to get file ${fileId}`));
      };
    });
  }

  async uploadFile(
    conversationId: UUID,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<{ fileId: UUID; abort: () => void }> {
    const encryptedFile = await this.encryptionService.encryptFile(file);
    
    const db = await this.initDB();
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);

    const fileId = crypto.randomUUID() as UUID;

    const fileRecord = {
      conversation_id: conversationId,
      file_id: fileId,
      file: encryptedFile,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fileRecord);
      request.onsuccess = () => {
        if (onUploadProgress) {
          onUploadProgress(100);
        }
        resolve({
          fileId,
          abort: () => {
            console.warn('Abort is not supported for local storage uploads.');
          },
        });
      };
      request.onerror = () => {
        reject(new Error(`Failed to upload file ${file.name}`));
      };
    });
  }

  async deleteFile(conversationId: UUID, fileId: UUID): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    return new Promise((resolve, reject) => {
      const request = store.delete([conversationId, fileId]);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error(`Failed to delete file ${fileId}`));
      };
    });
  }

  /* Customized Prompts */
  async getCustomizedPrompts(): Promise<CustomizedPromptsData> {
    const db = await this.initDB();
    const transaction = db.transaction([CUSTOMIZED_PROMPTS_STORE], 'readonly');
    const store = transaction.objectStore(CUSTOMIZED_PROMPTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.get('customized_prompts');
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          resolve({
            personal_info: {},
            prompts: {},
            enabled: true,
          });
        }
      };
    });
  }

  async createCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> {
    const db = await this.initDB();
    const transaction = db.transaction([CUSTOMIZED_PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOMIZED_PROMPTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => {
        resolve(data);
      };
      request.onerror = () => {
        reject(new Error('Failed to create customized prompts'));
      };
    });
  }

  async updateCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> {
    const db = await this.initDB();
    const transaction = db.transaction([CUSTOMIZED_PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOMIZED_PROMPTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => {
        resolve(data);
      };
      request.onerror = () => {
        reject(new Error('Failed to update customized prompts'));
      };
    });
  }

  async deleteCustomizedPrompts(): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([CUSTOMIZED_PROMPTS_STORE], 'readwrite');
    const store = transaction.objectStore(CUSTOMIZED_PROMPTS_STORE);
    return new Promise((resolve, reject) => {
      const request = store.delete('customized_prompts'); 
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(new Error('Failed to delete customized prompts'));
      };
    });
  }

  /* Misc */
  async clear(): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE, SUMMARIES_STORE, METADATA_STORE, FILES_STORE, CUSTOMIZED_PROMPTS_STORE], 'readwrite');

    return new Promise((resolve, reject) => {
      const stores = [CONVERSATIONS_STORE, MESSAGES_STORE, SUMMARIES_STORE, METADATA_STORE, FILES_STORE, CUSTOMIZED_PROMPTS_STORE];
      let completed = 0;

      for (const storeName of stores) {
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to clear store ${storeName}`));
        };
      }
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  setModels(models: ServerModelInfo[]): void {
    this.models = models;
  }

  // Helper method to convert local message to chat message
  private async mapStoredMessageToChatMessage(message: any): Promise<ChatMessage> {
    return createMessage({
      id: message.message_id,
      role: message.sender_type,
      content: message.content,
      visibleContent: await this.encryptionService.decrypt(message.content),
      files: message.files,
      date: new Date(message.timestamp),
      reasoning: message.reasoning_content,
      visibleReasoning: message.reasoning_content ? await this.encryptionService.decrypt(message.reasoning_content) : undefined,
      reasoningTime: message.reasoning_time
        ? parseInt(message.reasoning_time)
        : undefined,
      useSearch: message.custom_data?.useSearch ?? false,
      processEvents: message.custom_data?.processEvents ?? [],
      syncState: MessageSyncState.SYNCED,
      isError: message.is_error,
      errorMessage: message.error_message,
    });
  }
}