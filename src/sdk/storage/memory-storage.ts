import {
  IStorage,
  PaginatedMessages,
  PaginatedSummaries,
  PaginatedConversations,
} from './i-storage';
import { ChatMessage, CustomizedPromptsData } from '@/types';
import { EventBus } from '../events';
import { UUID } from 'crypto';
import {
  Summary,
  SummaryCreateRequest,
  ServerModelInfo,
  Conversation,
  ConversationUpdateRequest,
} from '@/client/types';
import { createMessage, MessageSyncState, Role } from "@/types/chat";
import { EncryptionService } from '../EncryptionService';

interface StoredMessage {
  message_id: string;
  conversation_id: string;
  sender_type: string;
  content: string;
  files?: any[];
  timestamp: string;
  reasoning_content?: string;
  reasoning_time?: string;
  custom_data?: any;
  is_error?: boolean;
  error_message?: string;
}

export class MemoryStorage implements IStorage {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, StoredMessage[]> = new Map();
  private summaries: Map<string, Summary[]> = new Map();
  private files: Map<string, Map<string, File>> = new Map();
  private customizedPrompts: CustomizedPromptsData = {
    personal_info: {},
    prompts: {},
    enabled: true,
  };
  private models: ServerModelInfo[] = [];
  
  private bus: EventBus;
  private encryptionService: EncryptionService;

  constructor(
    bus: EventBus,
    encryptionService: EncryptionService,
  ) {
    this.bus = bus;
    this.encryptionService = encryptionService;
  }

  /* Chats */
  async listChats(cursor?: string, limit: number = 20): Promise<PaginatedConversations> {
    const allConversations = Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allConversations.findIndex(conv => conv.conversation_id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const conversations = allConversations.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allConversations.length;
    const nextCursor = hasMore ? conversations[conversations.length - 1]?.conversation_id || null : null;

    return {
      conversations: conversations.map(conv => ({
        ...conv,
        conversation_id: conv.conversation_id as UUID,
      })),
      hasMore,
      nextCursor,
    };
  }

  async getChat(id: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      return {
        ...conversation,
        conversation_id: conversation.conversation_id as UUID,
      };
    }
    return undefined;
  }

  async createChat(
    title: string,
    customData?: Record<string, any>,
  ): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversationId = crypto.randomUUID();
    const encryptedTitle = this.encryptionService.encrypt(title.trim());

    const conversation: Conversation = {
      conversation_id: conversationId as UUID,
      title: encryptedTitle,
      created_at: now,
      updated_at: now,
      custom_data: customData,
    };

    this.conversations.set(conversationId, conversation);

    return {
      ...conversation,
      conversation_id: conversationId as UUID,
    };
  }

  async updateChat(
    chatId: string,
    data: Partial<ConversationUpdateRequest>,
  ): Promise<void> {
    console.log(`[MemoryStorage] Updating chat ${chatId} with data:`, data);
    const conversation = this.conversations.get(chatId);
    if (!conversation) {
      throw new Error(`Conversation ${chatId} not found`);
    }

    const updatedConversation: Conversation = {
      ...conversation,
      title: data.title || conversation.title,
      custom_data: data.custom_data !== undefined ? data.custom_data : conversation.custom_data,
      updated_at: new Date().toISOString(),
    };

    this.conversations.set(chatId, updatedConversation);
  }

  async deleteChat(id: string): Promise<void> {
    this.conversations.delete(id);
    this.messages.delete(id);
    this.summaries.delete(id);
    this.files.delete(id);
  }

  async deleteAllChats(): Promise<void> {
    this.conversations.clear();
    this.messages.clear();
    this.summaries.clear();
    this.files.clear();
  }

  /* Messages */
  async listMessages(
    chatId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedMessages> {
    const chatMessages = this.messages.get(chatId) || [];
    const sortedMessages = [...chatMessages].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sortedMessages.findIndex(msg => msg.message_id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const messagesSlice = sortedMessages.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedMessages.length;
    const nextCursor = hasMore ? messagesSlice[messagesSlice.length - 1]?.message_id || null : null;

    // Reverse to get chronological order (oldest first)
    const messages = messagesSlice.reverse().map(msg => this.mapStoredMessageToChatMessage(msg));

    return {
      messages,
      hasMore,
      nextCursor,
    };
  }

  async saveMessage(chatId: string, msg: ChatMessage): Promise<void> {
    console.log(`[MemoryStorage] Saving message ${msg.id} to chat ${chatId}`);
    const messageToStore: StoredMessage = {
      message_id: msg.id,
      conversation_id: chatId,
      sender_type: msg.role,
      content: msg.content, // Already encrypted
      files: msg.files,
      timestamp: msg.date.toISOString(),
      reasoning_content: msg.reasoning,
      reasoning_time: msg.reasoningTime?.toString(),
      custom_data: { useSearch: msg.useSearch },
      is_error: msg.isError,
      error_message: msg.errorMessage,
    };

    const chatMessages = this.messages.get(chatId) || [];
    const existingIndex = chatMessages.findIndex(m => m.message_id === msg.id);
    
    if (existingIndex !== -1) {
      chatMessages[existingIndex] = messageToStore;
    } else {
      chatMessages.push(messageToStore);
    }
    
    this.messages.set(chatId, chatMessages);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    const chatMessages = this.messages.get(chatId) || [];
    const filteredMessages = chatMessages.filter(msg => msg.message_id !== messageId);
    this.messages.set(chatId, filteredMessages);
  }

  async deleteMessages(chatId: string, messageIds: string[]): Promise<void> {
    const chatMessages = this.messages.get(chatId) || [];
    const messageIdSet = new Set(messageIds);
    const filteredMessages = chatMessages.filter(msg => !messageIdSet.has(msg.message_id));
    this.messages.set(chatId, filteredMessages);
  }

  /* Summaries */
  async getSummaries(chatId: string): Promise<Summary[]> {
    const chatSummaries = this.summaries.get(chatId) || [];
    return chatSummaries.map(summary => ({
      ...summary,
      summary_id: summary.summary_id as UUID,
      conversation_id: summary.conversation_id as UUID,
      start_message_id: summary.start_message_id as UUID,
      end_message_id: summary.end_message_id as UUID,
    }));
  }

  async saveSummary(chatId: string, summary: SummaryCreateRequest): Promise<Summary> {
    const now = new Date().toISOString();
    const summaryId = crypto.randomUUID();

    const newSummary: Summary = {
      summary_id: summaryId as UUID,
      conversation_id: chatId as UUID,
      start_message_id: summary.start_message_id as UUID,
      end_message_id: summary.end_message_id as UUID,
      content: summary.content,
      created_at: now,
      updated_at: now,
    };

    const chatSummaries = this.summaries.get(chatId) || [];
    chatSummaries.push(newSummary);
    this.summaries.set(chatId, chatSummaries);

    return {
      ...newSummary,
      summary_id: summaryId as UUID,
      conversation_id: chatId as UUID,
      start_message_id: summary.start_message_id,
      end_message_id: summary.end_message_id,
    };
  }

  async deleteSummary(id: string): Promise<void> {
    for (const [chatId, chatSummaries] of this.summaries.entries()) {
      const filteredSummaries = chatSummaries.filter(summary => summary.summary_id !== id);
      if (filteredSummaries.length !== chatSummaries.length) {
        this.summaries.set(chatId, filteredSummaries);
        break;
      }
    }
  }

  /* Files */
  async getFile(conversationId: UUID, fileId: UUID): Promise<File> {
    const conversationFiles = this.files.get(conversationId);
    if (!conversationFiles) {
      throw new Error(`No files found for conversation ${conversationId}`);
    }
    
    const file = conversationFiles.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found in conversation ${conversationId}`);
    }
    
    return file;
  }

  async uploadFile(
    conversationId: UUID,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<{ fileId: UUID; abort: () => void }> {
    const encryptedFile = await this.encryptionService.encryptFile(file);
    const fileId = crypto.randomUUID() as UUID;

    if (!this.files.has(conversationId)) {
      this.files.set(conversationId, new Map());
    }
    
    const conversationFiles = this.files.get(conversationId)!;
    conversationFiles.set(fileId, encryptedFile);

    // Simulate upload progress
    if (onUploadProgress) {
      setTimeout(() => onUploadProgress(100), 0);
    }

    return {
      fileId,
      abort: () => {
        console.warn('Abort is not supported for memory storage uploads.');
      },
    };
  }

  async deleteFile(conversationId: UUID, fileId: UUID): Promise<void> {
    const conversationFiles = this.files.get(conversationId);
    if (conversationFiles) {
      conversationFiles.delete(fileId);
    }
  }

  /* Customized Prompts */
  async getCustomizedPrompts(): Promise<CustomizedPromptsData> {
    return { ...this.customizedPrompts };
  }

  async createCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> {
    this.customizedPrompts = { ...data };
    return { ...this.customizedPrompts };
  }

  async updateCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> {
    this.customizedPrompts = { ...data };
    return { ...this.customizedPrompts };
  }

  async deleteCustomizedPrompts(): Promise<void> {
    this.customizedPrompts = {
      personal_info: {},
      prompts: {},
      enabled: true,
    };
  }

  /* Misc */
  async clear(): Promise<void> {
    this.conversations.clear();
    this.messages.clear();
    this.summaries.clear();
    this.files.clear();
    this.customizedPrompts = {
      personal_info: {},
      prompts: {},
      enabled: true,
    };
  }

  async close(): Promise<void> {
    // Nothing to close for memory storage
    return Promise.resolve();
  }

  setModels(models: ServerModelInfo[]): void {
    this.models = [...models];
  }

  // Helper method to convert stored message to chat message
  private mapStoredMessageToChatMessage(message: StoredMessage): ChatMessage {
    return createMessage({
      id: message.message_id as UUID,
      role: message.sender_type as Role,
      content: message.content,
      visibleContent: this.encryptionService.decrypt(message.content),
      files: message.files,
      date: new Date(message.timestamp),
      reasoning: message.reasoning_content,
      visibleReasoning: message.reasoning_content ? this.encryptionService.decrypt(message.reasoning_content) : undefined,
      reasoningTime: message.reasoning_time
        ? parseInt(message.reasoning_time)
        : undefined,
      useSearch: message.custom_data?.useSearch ?? false,
      syncState: MessageSyncState.SYNCED,
      isError: message.is_error,
      errorMessage: message.error_message,
    });
  }
}