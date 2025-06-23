import { IStorage, PaginatedChats, PaginatedMessages, PaginatedSummaries } from './i-storage';
import { Chat } from '@/sdk/Chat';
import { ChatMessage, CustomizedPromptsData } from '@/types';
import { EventBus } from '../events';
import { UUID } from 'crypto';
import { Summary } from '@/client/types';
import { AuthManager } from '../AuthManager';
import { EncryptionService } from '../EncryptionService';
import { ApiService } from '../api';

interface ChatRecord {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  modelConfig?: any;
  customData?: CustomizedPromptsData;
}

interface MessageRecord {
  id: string;
  chatId: string;
  role: string;
  content: string;
  files: any[];
  timestamp: number;
  reasoning?: string;
  reasoningTime?: number;
  useSearch: boolean;
  customData?: any;
}

interface SummaryRecord {
  id: string;
  chatId: string;
  startMessageId: string;
  endMessageId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class LocalStorage implements IStorage {
  private db: IDBDatabase | null = null;
  private dbName = 'PandaChatDB';
  private dbVersion = 1;
  private bus: EventBus;
  private api: ApiService;
  private authManager: AuthManager;
  private encryptionService: EncryptionService;

  constructor(
    bus: EventBus,
    api: ApiService,
    authManager: AuthManager,
    encryptionService: EncryptionService,
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.encryptionService = encryptionService;
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create chats store
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('chatId', 'chatId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('chatId_timestamp', ['chatId', 'timestamp'], { unique: false });
        }

        // Create summaries store
        if (!db.objectStoreNames.contains('summaries')) {
          const summaryStore = db.createObjectStore('summaries', { keyPath: 'id' });
          summaryStore.createIndex('chatId', 'chatId', { unique: false });
        }
      };
    });
  }

  private async getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDB();
    const transaction = db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  /*  Chats  */
  async listChats(cursor?: string, limit: number = 20): Promise<PaginatedChats> {
    const store = await this.getObjectStore('chats');
    const index = store.index('updatedAt');
    
    return new Promise((resolve, reject) => {
      const chats: Chat[] = [];
      let count = 0;
      let startKey: IDBValidKey | undefined;
      
      if (cursor) {
        try {
          startKey = parseInt(cursor);
        } catch {
          startKey = undefined;
        }
      }

      const request = index.openCursor(
        startKey ? IDBKeyRange.upperBound(startKey, true) : undefined,
        'prev' // Most recent first
      );

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && count < limit) {
          const record = cursor.value as ChatRecord;
          const chat = new Chat(
            this.bus,
            this.api,
            this.authManager,
            this.encryptionService,
            this,
            record.id as UUID,
            record.title,
            record.updatedAt,
            record.createdAt,
            record.modelConfig,
            record.customData,
          );
          chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
          chats.push(chat);
          count++;
          cursor.continue();
        } else {
          const hasMore = cursor !== null;
          const nextCursor = chats.length > 0 ? chats[chats.length - 1].updatedAt.toString() : null;
          
          resolve({
            chats,
            hasMore,
            nextCursor,
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const store = await this.getObjectStore('chats');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        const record = request.result as ChatRecord;
        if (record) {
          const chat = new Chat(
            this.bus,
            this.api,
            this.authManager,
            this.encryptionService,
            this,
            record.id as UUID,
            record.title,
            record.updatedAt,
            record.createdAt,
            record.modelConfig,
            record.customData,
          );
          chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
          resolve(chat);
        } else {
          resolve(undefined);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async createChat(
    title: string,
    modelConfig?: any,
    customizedPrompts?: any,
  ): Promise<Chat> {
    const encryptedTitle = this.encryptionService.encrypt(title.trim());
    const now = Date.now();
    const id = crypto.randomUUID() as UUID;
    
    const record: ChatRecord = {
      id,
      title: encryptedTitle,
      updatedAt: now,
      createdAt: now,
      modelConfig,
      customData: customizedPrompts,
    };

    const store = await this.getObjectStore('chats', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.add(record);
      
      request.onsuccess = () => {
        const chat = new Chat(
          this.bus,
          this.api,
          this.authManager,
          this.encryptionService,
          this,
          record.id as UUID,
          record.title,
          record.updatedAt,
          record.createdAt,
          record.modelConfig,
          record.customData,
        );
        chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
        resolve(chat);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateChat(chat: Chat): Promise<void> {
    const store = await this.getObjectStore('chats', 'readwrite');
    
    const record: ChatRecord = {
      id: chat.id,
      title: chat.encryptedTitle,
      updatedAt: Date.now(),
      createdAt: chat.createdAt,
      modelConfig: chat.modelConfig,
      customData: chat.customizedPrompts,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteChat(id: string): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(['chats', 'messages', 'summaries'], 'readwrite');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // Delete chat
      transaction.objectStore('chats').delete(id);
      
      // Delete associated messages
      const messageIndex = transaction.objectStore('messages').index('chatId');
      const messageRequest = messageIndex.openCursor(IDBKeyRange.only(id));
      messageRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete associated summaries
      const summaryIndex = transaction.objectStore('summaries').index('chatId');
      const summaryRequest = summaryIndex.openCursor(IDBKeyRange.only(id));
      summaryRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  /*  Messages  */
  async listMessages(
    chatId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginatedMessages> {
    const store = await this.getObjectStore('messages');
    const index = store.index('chatId_timestamp');
    
    return new Promise((resolve, reject) => {
      const messages: ChatMessage[] = [];
      let count = 0;
      let startKey: [string, number] | undefined;
      
      if (cursor) {
        try {
          startKey = [chatId, parseInt(cursor)];
        } catch {
          startKey = undefined;
        }
      }

      const keyRange = startKey 
        ? IDBKeyRange.bound([chatId, 0], startKey, false, true)
        : IDBKeyRange.bound([chatId, 0], [chatId, Date.now()], false, false);

      const request = index.openCursor(keyRange, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && count < limit) {
          const record = cursor.value as MessageRecord;
          const message: ChatMessage = {
            id: record.id as UUID,
            role: record.role as any,
            content: record.content,
            visibleContent: record.content,
            files: record.files || [],
            date: new Date(record.timestamp),
            streaming: false,
            isError: false,
            syncState: 'synced' as any,
            reasoning: record.reasoning,
            visibleReasoning: record.reasoning,
            reasoningTime: record.reasoningTime,
            isReasoning: false,
            useSearch: record.useSearch || false,
          };
          messages.push(message);
          count++;
          cursor.continue();
        } else {
          const hasMore = cursor !== null;
          const nextCursor = messages.length > 0 ? messages[messages.length - 1].date.getTime().toString() : null;
          
          resolve({
            messages: messages.reverse(), // Return in chronological order
            hasMore,
            nextCursor,
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveMessage(chatId: string, msg: ChatMessage): Promise<void> {
    const record: MessageRecord = {
      id: msg.id,
      chatId,
      role: msg.role,
      content: msg.content,
      files: msg.files || [],
      timestamp: msg.date.getTime(),
      reasoning: msg.reasoning,
      reasoningTime: msg.reasoningTime,
      useSearch: msg.useSearch,
      customData: { useSearch: msg.useSearch },
    };

    const store = await this.getObjectStore('messages', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      
      request.onsuccess = () => {
        console.log(`[LocalStorage] Saved message ${msg.id} to chat ${chatId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMessage(id: string): Promise<void> {
    const store = await this.getObjectStore('messages', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /*  Summaries  */
  async getSummaries(chatId: string): Promise<Summary[]> {
    const store = await this.getObjectStore('summaries');
    const index = store.index('chatId');
    
    return new Promise((resolve, reject) => {
      const summaries: Summary[] = [];
      const request = index.openCursor(IDBKeyRange.only(chatId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const record = cursor.value as SummaryRecord;
          const summary: Summary = {
            summary_id: record.id as UUID,
            conversation_id: record.chatId as UUID,
            start_message_id: record.startMessageId as UUID,
            end_message_id: record.endMessageId as UUID,
            content: record.content,
            created_at: record.createdAt,
            updated_at: record.updatedAt,
          };
          summaries.push(summary);
          cursor.continue();
        } else {
          resolve(summaries);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveSummary(chatId: string, summary: Summary): Promise<void> {
    const record: SummaryRecord = {
      id: summary.summary_id,
      chatId,
      startMessageId: summary.start_message_id,
      endMessageId: summary.end_message_id,
      content: summary.content,
      createdAt: summary.created_at || new Date().toISOString(),
      updatedAt: summary.updated_at || new Date().toISOString(),
    };

    const store = await this.getObjectStore('summaries', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSummary(id: string): Promise<void> {
    const store = await this.getObjectStore('summaries', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /*  Misc  */
  async clear(): Promise<void> {
    const db = await this.initDB();
    const transaction = db.transaction(['chats', 'messages', 'summaries'], 'readwrite');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('[LocalStorage] Cleared all data');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore('chats').clear();
      transaction.objectStore('messages').clear();
      transaction.objectStore('summaries').clear();
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}