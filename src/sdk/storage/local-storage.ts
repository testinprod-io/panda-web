import {
  IStorage,
  PaginatedMessages,
  PaginatedSummaries,
  PaginatedConversations,
} from './i-storage';
import { ChatMessage, CustomizedPromptsData } from '@/types';
import { UUID } from 'crypto';
import {
  MessageCreateRequest,
  Summary,
  SummaryCreateRequest,
  ServerModelInfo,
  Conversation,
  ConversationUpdateRequest,
  Message as ApiMessage,
} from '@/client/types';
import { createMessage, MessageSyncState, Role } from "@/types/chat";
import { EncryptionService } from '@/services/encryption-service';

// Simple EventBus stub for compatibility
class EventBus {
  emit(event: string, data?: any) {
    // Stub implementation
  }
  on(event: string, handler: Function) {
    // Stub implementation
  }
}

interface LocalConversation extends Conversation {
  lastUpdated: number;
}

interface LocalMessage {
  id: string;
  conversationId: string;
  messageId: string;
  senderType: Role;
  content: string;
  files?: any[];
  customData?: Record<string, any>;
  reasoningContent?: string;
  reasoningTime?: string;
  timestamp: number;
  isError?: boolean;
  errorMessage?: string;
}

interface LocalSummary extends Summary {
  // Summary already includes conversation_id, created_at, updated_at
}

const DB_NAME = 'PandaChatLocalDB';
const DB_VERSION = 1;

export class LocalStorage implements IStorage {
  private db: IDBDatabase | null = null;
  private bus: EventBus;
  private encryptionService: typeof EncryptionService;
  private models: ServerModelInfo[] = [];

  constructor(
    bus: EventBus,
    encryptionService: typeof EncryptionService,
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
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', {
            keyPath: 'conversation_id'
          });
          conversationStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', {
            keyPath: 'id'
          });
          messageStore.createIndex('conversationId', 'conversationId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('messageId', 'messageId', { unique: false });
        }

        // Summaries store
        if (!db.objectStoreNames.contains('summaries')) {
          const summaryStore = db.createObjectStore('summaries', {
            keyPath: 'summary_id'
          });
          summaryStore.createIndex('conversationId', 'conversation_id', { unique: false });
        }
      };
    });
  }

  async listChats(
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedConversations> {
    const db = await this.initDB();
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('lastUpdated');

    return new Promise((resolve, reject) => {
      const conversations: Conversation[] = [];
      let count = 0;
      let hasMore = false;
      let nextCursor: string | null = null;

            const request = index.openCursor(null, 'prev'); // Get newest first

      request.onsuccess = () => {
        const idbCursor = request.result;
        
        if (idbCursor && count < limit) {
          const conversation = idbCursor.value as LocalConversation;
          
          // Skip until we reach the cursor position
          if (!cursor || conversation.conversation_id >= cursor) {
            conversations.push({
              conversation_id: conversation.conversation_id,
              title: conversation.title,
              created_at: conversation.created_at,
              updated_at: conversation.updated_at,
              custom_data: conversation.custom_data,
            });
            count++;
          }
          
          idbCursor.continue();
        } else {
          if (idbCursor) {
            hasMore = true;
            nextCursor = idbCursor.value.conversation_id;
          }
          
          resolve({
            conversations,
            hasMore,
            nextCursor,
          });
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to list conversations'));
      };
    });
  }

  async getChat(id: string): Promise<Conversation | undefined> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');

      return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
          const result = request.result as LocalConversation;
          if (result) {
            resolve({
              conversation_id: result.conversation_id,
              title: result.title,
              created_at: result.created_at,
              updated_at: result.updated_at,
              custom_data: result.custom_data,
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
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');

    const conversationId = crypto.randomUUID() as UUID;
    const timestamp = new Date().toISOString();
    const encryptedTitle = this.encryptionService.encrypt(title.trim());

    const conversation: LocalConversation = {
      conversation_id: conversationId,
      title: encryptedTitle,
      created_at: timestamp,
      updated_at: timestamp,
      custom_data: customData,
      lastUpdated: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(conversation);

      request.onsuccess = () => {
        resolve({
          conversation_id: conversation.conversation_id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          custom_data: conversation.custom_data,
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
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(chatId);

      getRequest.onsuccess = () => {
        const conversation = getRequest.result as LocalConversation;
        if (!conversation) {
          reject(new Error(`Conversation ${chatId} not found`));
          return;
        }

        const updatedConversation: LocalConversation = {
          ...conversation,
          title: data.title || conversation.title,
          updated_at: new Date().toISOString(),
          lastUpdated: Date.now(),
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
    const transaction = db.transaction(['conversations', 'messages', 'summaries'], 'readwrite');
    
    // Delete conversation
    const conversationStore = transaction.objectStore('conversations');
    conversationStore.delete(id);
    
    // Delete all messages for this conversation
    const messageStore = transaction.objectStore('messages');
    const messageIndex = messageStore.index('conversationId');
    const messageRequest = messageIndex.openCursor(IDBKeyRange.only(id));
    
    messageRequest.onsuccess = () => {
      const cursor = messageRequest.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete all summaries for this conversation
    const summaryStore = transaction.objectStore('summaries');
    const summaryIndex = summaryStore.index('conversationId');
    const summaryRequest = summaryIndex.openCursor(IDBKeyRange.only(id));
    
    summaryRequest.onsuccess = () => {
      const cursor = summaryRequest.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to delete conversation'));
      };
    });
  }

  async listMessages(
    chatId: string,
    cursor?: string | undefined,
    limit?: number | undefined,
  ): Promise<PaginatedMessages> {
    const db = await this.initDB();
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('conversationId');

    const actualLimit = limit || 50;

    return new Promise((resolve, reject) => {
      const messages: LocalMessage[] = [];
      let count = 0;
      let hasMore = false;
      let nextCursor: string | null = null;

      const request = index.openCursor(IDBKeyRange.only(chatId), 'prev');

      request.onsuccess = () => {
        const cursorResult = request.result;
        
        if (cursorResult && count < actualLimit) {
          const message = cursorResult.value as LocalMessage;
          
          // Skip until we reach the cursor position
          if (!cursor || message.id >= cursor) {
            messages.push(message);
            count++;
          }
          
          cursorResult.continue();
        } else {
          if (cursorResult) {
            hasMore = true;
            nextCursor = cursorResult.value.id;
          }

          const chatMessages = this.mapLocalMessagesToChatMessages(messages.reverse());
          
          resolve({
            messages: chatMessages,
            hasMore,
            nextCursor,
          });
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to list messages'));
      };
    });
  }

  async saveMessage(chatId: string, msg: ChatMessage): Promise<void> {
    console.log(`[LocalStorage] Saving message ${msg.id} to chat ${chatId}`);
    const db = await this.initDB();
    const transaction = db.transaction(['messages', 'conversations'], 'readwrite');
    const messageStore = transaction.objectStore('messages');
    const conversationStore = transaction.objectStore('conversations');

    const localMessage: LocalMessage = {
      id: crypto.randomUUID() as UUID,
      conversationId: chatId,
      messageId: msg.id,
      senderType: msg.role,
      content: msg.content,
      files: msg.files,
      customData: { useSearch: msg.useSearch },
      reasoningContent: msg.reasoning,
      reasoningTime: msg.reasoningTime?.toString(),
      timestamp: msg.date.getTime(),
      isError: msg.isError,
      errorMessage: msg.errorMessage,
    };

    return new Promise((resolve, reject) => {
      const messageRequest = messageStore.add(localMessage);

      messageRequest.onsuccess = () => {
        // Update conversation's last message timestamp
        const getConversationRequest = conversationStore.get(chatId);
        
        getConversationRequest.onsuccess = () => {
          const conversation = getConversationRequest.result as LocalConversation;
          if (conversation) {
            conversation.updated_at = new Date().toISOString();
            conversation.lastUpdated = Date.now();
            conversationStore.put(conversation);
          }
          resolve();
        };

        getConversationRequest.onerror = () => {
          resolve(); // Still resolve if conversation update fails
        };
      };

      messageRequest.onerror = () => {
        reject(new Error('Failed to save message'));
      };
    });
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    await this.deleteMessages(chatId, [messageId]);
  }

  async deleteMessages(chatId: string, messageIds: string[]): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const index = store.index('conversationId');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(chatId));
      const deletePromises: Promise<void>[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const message = cursor.value as LocalMessage;
          if (messageIds.includes(message.messageId)) {
            deletePromises.push(
              new Promise((deleteResolve, deleteReject) => {
                const deleteRequest = cursor.delete();
                deleteRequest.onsuccess = () => deleteResolve();
                deleteRequest.onerror = () => deleteReject(new Error('Failed to delete message'));
              })
            );
          }
          cursor.continue();
        } else {
          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(reject);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to delete messages'));
      };
    });
  }

  async getSummaries(chatId: string): Promise<Summary[]> {
    const db = await this.initDB();
    const transaction = db.transaction(['summaries'], 'readonly');
    const store = transaction.objectStore('summaries');
    const index = store.index('conversationId');

    return new Promise((resolve, reject) => {
      const summaries: Summary[] = [];
      const request = index.openCursor(IDBKeyRange.only(chatId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const localSummary = cursor.value as LocalSummary;
          summaries.push({
            summary_id: localSummary.summary_id,
            content: localSummary.content,
            start_message_id: localSummary.start_message_id,
            end_message_id: localSummary.end_message_id,
          });
          cursor.continue();
        } else {
          resolve(summaries);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get summaries'));
      };
    });
  }

  async saveSummary(chatId: string, summary: SummaryCreateRequest): Promise<Summary> {
    const db = await this.initDB();
    const transaction = db.transaction(['summaries'], 'readwrite');
    const store = transaction.objectStore('summaries');

    const localSummary: LocalSummary = {
      summary_id: crypto.randomUUID() as UUID,
      conversation_id: chatId as UUID,
      content: summary.content,
      start_message_id: summary.start_message_id,
      end_message_id: summary.end_message_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(localSummary);

      request.onsuccess = () => {
        resolve({
          summary_id: localSummary.summary_id,
          conversation_id: localSummary.conversation_id,
          content: localSummary.content,
          start_message_id: localSummary.start_message_id,
          end_message_id: localSummary.end_message_id,
          created_at: localSummary.created_at,
          updated_at: localSummary.updated_at,
        });
      };

      request.onerror = () => {
        reject(new Error('Failed to save summary'));
      };
    });
  }

  async deleteSummary(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(['summaries'], 'readwrite');
    const store = transaction.objectStore('summaries');

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

  async clear(): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(['conversations', 'messages', 'summaries'], 'readwrite');

    const conversationStore = transaction.objectStore('conversations');
    const messageStore = transaction.objectStore('messages');
    const summaryStore = transaction.objectStore('summaries');

    return new Promise((resolve, reject) => {
      Promise.all([
        new Promise<void>((res, rej) => {
          const req = conversationStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(new Error('Failed to clear conversations'));
        }),
        new Promise<void>((res, rej) => {
          const req = messageStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(new Error('Failed to clear messages'));
        }),
        new Promise<void>((res, rej) => {
          const req = summaryStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(new Error('Failed to clear summaries'));
        }),
      ]).then(() => resolve()).catch(reject);
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

  private mapLocalMessagesToChatMessages(messages: LocalMessage[]): ChatMessage[] {
    return messages.map((msg) => this.mapLocalMessageToChatMessage(msg));
  }

  private mapLocalMessageToChatMessage(message: LocalMessage): ChatMessage {
    return createMessage({
      id: message.messageId,
      role: message.senderType,
      content: message.content,
      visibleContent: this.encryptionService.decrypt(message.content),
      files: message.files,
      date: new Date(message.timestamp),
      reasoning: message.reasoningContent,
      visibleReasoning: message.reasoningContent ? this.encryptionService.decrypt(message.reasoningContent) : undefined,
      reasoningTime: message.reasoningTime
        ? parseInt(message.reasoningTime)
        : undefined,
      useSearch: message.customData?.useSearch ?? false,
      syncState: MessageSyncState.SYNCED,
      isError: message.isError,
      errorMessage: message.errorMessage,
    });
  }
}