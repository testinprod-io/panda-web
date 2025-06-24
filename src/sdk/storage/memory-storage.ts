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

export class MemoryStorage implements IStorage {
  private chats: Map<string, ChatRecord> = new Map();
  private messages: Map<string, MessageRecord> = new Map();
  private summaries: Map<string, SummaryRecord> = new Map();
  
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

  /*  Chats  */
  async listChats(cursor?: string, limit: number = 20): Promise<PaginatedChats> {
    // Get all chats and sort by updatedAt (most recent first)
    const allChats = Array.from(this.chats.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);

    let startIndex = 0;
    if (cursor) {
      try {
        const cursorTime = parseInt(cursor);
        startIndex = allChats.findIndex(chat => chat.updatedAt < cursorTime);
        if (startIndex === -1) startIndex = allChats.length;
      } catch {
        startIndex = 0;
      }
    }

    const paginatedRecords = allChats.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allChats.length;
    const nextCursor = hasMore && paginatedRecords.length > 0 
      ? paginatedRecords[paginatedRecords.length - 1].updatedAt.toString() 
      : null;

    const chats = paginatedRecords.map(record => {
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
      return chat;
    });

    return {
      chats,
      hasMore,
      nextCursor,
    };
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const record = this.chats.get(id);
    if (!record) {
      return undefined;
    }

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
    return chat;
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

    this.chats.set(id, record);

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
    return chat;
  }

  async updateChat(chat: Chat): Promise<void> {
    const record: ChatRecord = {
      id: chat.id,
      title: chat.encryptedTitle,
      updatedAt: Date.now(),
      createdAt: chat.createdAt,
      modelConfig: chat.modelConfig,
      customData: chat.customizedPrompts,
    };

    this.chats.set(chat.id, record);
  }

  async deleteChat(id: string): Promise<void> {
    // Delete chat
    this.chats.delete(id);
    
    // Delete associated messages
    const messagesToDelete = Array.from(this.messages.values())
      .filter(message => message.chatId === id)
      .map(message => message.id);
    
    messagesToDelete.forEach(messageId => {
      this.messages.delete(messageId);
    });

    // Delete associated summaries
    const summariesToDelete = Array.from(this.summaries.values())
      .filter(summary => summary.chatId === id)
      .map(summary => summary.id);
    
    summariesToDelete.forEach(summaryId => {
      this.summaries.delete(summaryId);
    });
  }

  /*  Messages  */
  async listMessages(
    chatId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginatedMessages> {
    // Get all messages for this chat and sort by timestamp (oldest first for final result)
    const allMessages = Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first for pagination

    let startIndex = 0;
    if (cursor) {
      try {
        const cursorTime = parseInt(cursor);
        startIndex = allMessages.findIndex(message => message.timestamp < cursorTime);
        if (startIndex === -1) startIndex = allMessages.length;
      } catch {
        startIndex = 0;
      }
    }

    const paginatedRecords = allMessages.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allMessages.length;
    const nextCursor = hasMore && paginatedRecords.length > 0 
      ? paginatedRecords[paginatedRecords.length - 1].timestamp.toString() 
      : null;

    // Convert to ChatMessage format and reverse to get chronological order
    const messages = paginatedRecords.map(record => {
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
      return message;
    }).reverse(); // Return in chronological order (oldest first)

    return {
      messages,
      hasMore,
      nextCursor,
    };
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

    this.messages.set(msg.id, record);
    console.log(`[MemoryStorage] Saved message ${msg.id} to chat ${chatId}`);
  }

  async deleteMessage(id: string): Promise<void> {
    this.messages.delete(id);
  }

  /*  Summaries  */
  async getSummaries(chatId: string): Promise<Summary[]> {
    const summaryRecords = Array.from(this.summaries.values())
      .filter(summary => summary.chatId === chatId);

    const summaries = summaryRecords.map(record => {
      const summary: Summary = {
        summary_id: record.id as UUID,
        conversation_id: record.chatId as UUID,
        start_message_id: record.startMessageId as UUID,
        end_message_id: record.endMessageId as UUID,
        content: record.content,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      };
      return summary;
    });

    return summaries;
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

    this.summaries.set(summary.summary_id, record);
  }

  async deleteSummary(id: string): Promise<void> {
    this.summaries.delete(id);
  }

  /*  Misc  */
  async clear(): Promise<void> {
    this.chats.clear();
    this.messages.clear();
    this.summaries.clear();
    console.log('[MemoryStorage] Cleared all data from memory');
  }

  async close(): Promise<void> {
    // No cleanup needed for memory storage
    console.log('[MemoryStorage] Close called - no cleanup needed for memory storage');
  }

  // Additional utility methods for debugging/monitoring
  getMemoryUsage(): { chats: number; messages: number; summaries: number } {
    return {
      chats: this.chats.size,
      messages: this.messages.size,
      summaries: this.summaries.size,
    };
  }
}