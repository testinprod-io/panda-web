import { IStorage, PaginatedChats, PaginatedMessages, PaginatedSummaries } from './i-storage';
import { Chat } from '@/sdk/Chat';
import { ChatMessage, CustomizedPromptsData } from '@/types';
import { ApiService } from '../api';
import { AuthManager } from '../AuthManager';
import { EventBus } from '../events';
import { UUID } from 'crypto';
import {
  MessageCreateRequest,
  Summary,
  SummaryCreateRequest,
  ServerModelInfo,
} from '@/client/types';
import { mapApiMessagesToChatMessages } from '@/services/api-service';
import { EncryptionService } from '../EncryptionService';


export class ServerStorage implements IStorage {
  private api: ApiService;
  private authManager: AuthManager;
  private bus: EventBus;
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

  async listChats(
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedChats> {
    const response = await this.api.app.getConversations({
      limit,
      cursor: cursor ?? undefined,
    });
    const chats = response.data.map(
      (c) =>
        new Chat(
          this.bus,
          this.api,
          this.authManager,
          this.encryptionService,
          this,
          c.conversation_id,
          c.title ?? '',
          new Date(c.updated_at).getTime(),
          new Date(c.created_at).getTime(),
          c.custom_data?.model_config as ServerModelInfo,
          c.custom_data as CustomizedPromptsData,
        ),
    );

    chats.forEach(
      (c) => (c.title = this.encryptionService.decrypt(c.encryptedTitle)),
    );

    return {
      chats,
      hasMore: response.pagination.has_more,
      nextCursor: response.pagination.next_cursor,
    };
  }
  async getChat(id: string): Promise<Chat | undefined> {
    try {
      const conversation = await this.api.app.getConversation(id as UUID);
      const chat = new Chat(
        this.bus,
        this.api,
        this.authManager,
        this.encryptionService,
        this,
        conversation.conversation_id,
        conversation.title ?? '',
        new Date(conversation.updated_at).getTime(),
        new Date(conversation.created_at).getTime(),
        conversation.custom_data?.model_config as ServerModelInfo,
        conversation.custom_data,
      );
      chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
      return chat;
    } catch (error) {
      console.error(`[ServerStorage] Failed to get chat ${id}:`, error);
      return undefined;
    }
  }

  async createChat(
    title: string,
    modelConfig: ServerModelInfo,
    customData?: Record<string, any>,
  ): Promise<Chat> {
    const encryptedTitle = this.encryptionService.encrypt(title.trim());
    const newRawChat = await this.api.app.createConversation({
      title: encryptedTitle,
      custom_data: customData,
    });
    const newChat = new Chat(
      this.bus,
      this.api,
      this.authManager,
      this.encryptionService,
      this,
      newRawChat.conversation_id,
      newRawChat.title ?? '',
      new Date(newRawChat.updated_at).getTime(),
      new Date(newRawChat.created_at).getTime(),
      modelConfig,
      customData,
    );
    newChat.title = this.encryptionService.decrypt(newChat.encryptedTitle);
    return newChat;
  }
  async updateChat(chat: Chat): Promise<void> {
    await this.api.app.updateConversation(chat.id, {
      title: chat.encryptedTitle,
      custom_data: chat.customData,
    });
  }

  async deleteChat(id: string): Promise<void> {
    await this.api.app.deleteConversation(id as UUID);
  }

  async listMessages(
    chatId: string,
    cursor?: string | undefined,
    limit?: number | undefined,
  ): Promise<PaginatedMessages> {
    const result = await this.api.app.getConversationMessages(chatId as UUID, {
      limit,
      cursor,
    });
    const messages = mapApiMessagesToChatMessages(
      result.data.slice().reverse(),
    );

    return {
      messages,
      hasMore: result.pagination.has_more,
      nextCursor: result.pagination.next_cursor,
    };
  }

  async saveMessage(chatId: string, msg: ChatMessage): Promise<void> {
    console.log(`[ServerStorage] Saving message ${msg.id} to chat ${chatId}`);
    const request: MessageCreateRequest = {
      message_id: msg.id,
      sender_type: msg.role,
      content: msg.content,
      files: msg.files,
      custom_data: { useSearch: msg.useSearch },
      reasoning_content: msg.reasoning,
      reasoning_time: msg.reasoningTime?.toString(),
    };
    await this.api.app.createMessage(chatId as UUID, request);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    await this.api.app.deleteMessages(chatId as UUID, [messageId as UUID]);
  }

  async deleteMessages(chatId: string, messageIds: UUID[]): Promise<void> {
    await this.api.app.deleteMessages(chatId as UUID, messageIds);
  }

  /* Summaries */
  async getSummaries(chatId: string): Promise<Summary[]> {
    const summaries = await this.api.app.getSummaries(chatId as UUID);
    return summaries;
  }
  async saveSummary(chatId: string, summary: Summary): Promise<void> {
    const summaryCreate: SummaryCreateRequest = {
      content: summary.content,
      start_message_id: summary.start_message_id,
      end_message_id: summary.end_message_id,
    };
    await this.api.app.createSummary(chatId as UUID, summaryCreate);
  }

  async deleteSummary(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async clear(): Promise<void> {
    // This would likely be a developer-only feature,
    // as it would wipe all of a user's history.
    console.warn(
      'ServerStorage.clear() is not implemented, as it is a destructive action.',
    );
    return Promise.resolve();
  }

  setModels(models: ServerModelInfo[]): void {
    // this.models = models;
  }
}