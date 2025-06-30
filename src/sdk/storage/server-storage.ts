import {
  IStorage,
  PaginatedMessages,
  PaginatedSummaries,
  PaginatedConversations,
} from './i-storage';
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
  Conversation,
  ConversationUpdateRequest,
  Message as ApiMessage,
} from '@/sdk/client/types';
import { createMessage, MessageSyncState, Role } from "@/types/chat";

// import { mapApiMessagesToChatMessages } from '@/services/api-service';
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
  ): Promise<PaginatedConversations> {
    const response = await this.api.app.getConversations({
      limit,
      cursor: cursor ?? undefined,
    });

    return {
      conversations: response.data,
      hasMore: response.pagination.has_more,
      nextCursor: response.pagination.next_cursor,
    };
  }
  async getChat(id: string): Promise<Conversation | undefined> {
    try {
      return await this.api.app.getConversation(id as UUID);
    } catch (error) {
      console.error(`[ServerStorage] Failed to get chat ${id}:`, error);
      return undefined;
    }
  }

  async createChat(
    title: string,
    customData?: Record<string, any>,
  ): Promise<Conversation> {
    const encryptedTitle = this.encryptionService.encrypt(title.trim());
    return await this.api.app.createConversation({
      title: encryptedTitle,
      custom_data: customData,
    });
  }
  async updateChat(
    chatId: string,
    data: Partial<ConversationUpdateRequest>,
  ): Promise<void> {
    console.log(`[ServerStorage] Updating chat ${chatId} with data:`, data);
    const conversationUpdateRequest: ConversationUpdateRequest = {
      title: data.title ?? "",
      custom_data: data.custom_data,
    };
    await this.api.app.updateConversation(chatId as UUID, conversationUpdateRequest);
  }

  async deleteChat(id: string): Promise<void> {
    await this.api.app.deleteConversation(id as UUID);
  }

  async deleteAllChats(): Promise<void> {
    await this.api.app.deleteConversations();
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
    const messages = this.mapApiMessagesToChatMessages(
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
    console.log("msg", msg.reasoningTime);
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
  async saveSummary(chatId: string, summary: SummaryCreateRequest): Promise<Summary> {
    const summaryCreate: SummaryCreateRequest = {
      content: summary.content,
      start_message_id: summary.start_message_id,
      end_message_id: summary.end_message_id,
    };
    return (await this.api.app.createSummary(chatId as UUID, summaryCreate)).data;
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

  /* Files */
  async getFile(conversationId: UUID, fileId: UUID): Promise<File> {
    const response = await this.api.app.getFile(conversationId, fileId);
    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition");
    let fileName = "unknown";
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch.length > 1) {
        fileName = fileNameMatch[1];
      }
    }
    return new File([blob], fileName, { type: blob.type });
  }

  async uploadFile(
    conversationId: UUID,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<{ fileId: UUID; abort: () => void }> {
    const encryptedFile = await this.encryptionService.encryptFile(file);
    const encryptedFileName = this.encryptionService.encrypt(file.name);
    const { fileResponse, abort } = await this.api.app.uploadFile(
      conversationId,
      encryptedFile,
      encryptedFileName,
      file.size,
      onUploadProgress,
    );
    return { fileId: fileResponse.file_id as UUID, abort };
  }

  async deleteFile(conversationId: UUID, fileId: UUID): Promise<void> {
    await this.api.app.deleteFile(conversationId, fileId);
  }


  /* Customized Prompts */
  async getCustomizedPrompts(): Promise<CustomizedPromptsData> {
    const response = await this.api.app.getCustomizedPrompts();
    return response;
  }

  async createCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> { 
    const response = await this.api.app.createCustomizedPrompts(data);
    return response;
  }

  async updateCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData> {
    const response = await this.api.app.updateCustomizedPrompts(data);
    return response;
  }

  async deleteCustomizedPrompts(): Promise<void> {
    await this.api.app.deleteCustomizedPrompts();
  }

  setModels(models: ServerModelInfo[]): void {
    // this.models = models;
  }

mapApiMessagesToChatMessages(
  messages: ApiMessage[],
): ChatMessage[] {
  return messages.map((msg) => this.mapApiMessageToChatMessage(msg));
}

mapApiMessageToChatMessage(message: ApiMessage): ChatMessage {
  return createMessage({
    id: message.message_id,
    role: message.sender_type,
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