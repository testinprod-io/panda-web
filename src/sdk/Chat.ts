import { UUID } from 'crypto';
import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { ChatMessage, createMessage, Role, MessageSyncState, CustomizedPromptsData } from '@/types';
import { FileInfo, GetConversationMessagesParams, Summary, MessageCreateRequest } from '@/client/types';
import { MultimodalContent, LLMConfig } from '@/client/api';
import { mapApiMessagesToChatMessages } from '@/services/api-service';
import { ModelConfig } from '@/types/constant';
import { EventBus } from './events';
import { IStorage } from './storage/i-storage';
import { EncryptionService } from './EncryptionService';

export class Chat {
  private bus: EventBus;
  private encryptionService: EncryptionService;

  public readonly id: UUID;
  public title: string = "";
  public encryptedTitle: string;
  public messages: ChatMessage[];
  public modelConfig?: ModelConfig;
  public customizedPrompts?: CustomizedPromptsData;

  public updatedAt: number;
  public createdAt: number;

  // State migrated from the hook
  public hasMoreMessages: boolean = true;
  private nextMessageCursor: string | null = null;
  public isLoading: boolean = false;
  
  public summaries: Summary[] = [];
  private lastSummarizedMessageId: string | null = null;
  private isSummarizing: boolean = false;

  private api: ApiService;
  private authManager: AuthManager;
  private storage: IStorage;

  private state: {
    messages: ChatMessage[];
    isLoading: boolean;
    hasMoreMessages: boolean;
  };

  constructor(
    bus: EventBus,
    api: ApiService, 
    authManager: AuthManager, 
    encryptionService: EncryptionService,
    storage: IStorage,
    id: UUID, 
    encryptedTitle: string,
    updatedAt: number,
    createdAt: number,
    modelConfig?: ModelConfig,
    customizedPrompts?: CustomizedPromptsData,
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.storage = storage;
    this.encryptionService = encryptionService;
    this.id = id;
    this.encryptedTitle = encryptedTitle;
    this.modelConfig = modelConfig;
    this.customizedPrompts = customizedPrompts;
    this.messages = [];
    this.state = this.buildState();
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
    this.updateState();
  }

  private buildState() {
    return {
      messages: this.messages,
      isLoading: this.isLoading,
      hasMoreMessages: this.hasMoreMessages,
    };
  }

  private updateState() {
    this.state = this.buildState();
    this.bus.emit('chat.updated', undefined);
  }

  /**
   * Performs the initial load of messages and summaries for this chat.
   * Adapted from the initial useEffect in useChatSessionManager.
   */
  public async loadInitial() {
    if (this.isLoading) return;
    console.log(`[SDK-Chat] Initializing message and summary load for chat ${this.id}.`);
    this.isLoading = true;
    this.updateState();
    
    try {
      const [messagesResult, summariesResult] = await Promise.all([
        this.storage.listMessages(this.id as string, undefined, 20),
        this.storage.getSummaries(this.id as string),
      ]);

      // Process messages
      this.messages = messagesResult.messages;
      this.hasMoreMessages = messagesResult.hasMore;
      this.nextMessageCursor = messagesResult.nextCursor;
      
      // Process summaries
      const sortedSummaries = [...summariesResult].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      sortedSummaries.forEach((summary) => {
        summary.content = this.encryptionService.decrypt(summary.content);
      });

      let lastId: UUID | null = null;
      if (sortedSummaries.length > 0) {
        lastId = sortedSummaries[0].end_message_id;
      }
      this.summaries = sortedSummaries;
      this.lastSummarizedMessageId = lastId;

      console.log(`[SDK-Chat] Initial load complete. Messages: ${this.messages.length}, Summaries: ${this.summaries.length}`);

    } catch (error) {
      console.error(`[SDK-Chat] Error loading initial data for chat ${this.id}:`, error);
    } finally {
      this.isLoading = false;
      this.updateState();
    }
  }
  
  /**
   * Fetches the next page of messages.
   * Adapted from loadMoreMessages in useChatSessionManager.
   */
  public async loadMoreMessages() {
    if (this.isLoading || !this.hasMoreMessages) return;

    console.log(`[SDK-Chat] Loading more messages for ${this.id}, cursor: ${this.nextMessageCursor}`);
    this.isLoading = true;
    this.updateState();

    try {
      const result = await this.storage.listMessages(
        this.id as string,
        this.nextMessageCursor ?? undefined,
        20,
      );

      const olderMessages = result.messages;
      this.messages = [...olderMessages, ...this.messages];

      this.hasMoreMessages = result.hasMore;
      this.nextMessageCursor = result.nextCursor;
      console.log(
        `[SDK-Chat] Loaded ${olderMessages.length} more messages. Total now: ${this.messages.length}.`,
      );
    } catch (error) {
      console.error(`[SDK-Chat] Error loading more messages for chat ${this.id}:`, error);
    } finally {
      this.isLoading = false;
      this.updateState();
    }
  }

  public async sendMessage(
    userInput: string,
    modelConfig: ModelConfig,
    options: {
        enableSearch?: boolean;
        files?: FileInfo[];
        attachments?: MultimodalContent[];
        onReasoningStart?: (messageId: UUID) => void;
        onReasoningChunk?: (messageId: UUID, reasoningChunk: string) => void;
        onReasoningEnd?: (messageId: UUID) => void;
        onContentChunk?: (messageId: UUID, contentChunk: string) => void;
        onSuccess?: (messageId: UUID, finalMessage: string, timestamp: Date) => void;
        onFailure?: (error: Error) => void;
    }
  ) {
    const userMessage = createMessage({
        role: Role.USER,
        content: this.encryptionService.encrypt(userInput),
        visibleContent: userInput,
        attachments: options.attachments,
        files: options.files,
        useSearch: options.enableSearch ?? false,
        syncState: MessageSyncState.PENDING_CREATE,
    });
    await this.storage.saveMessage(this.id as string, userMessage);
    this.messages.push(userMessage);
    this.updateState();
    
    let messagesForApi: any[] = [];
    this.summaries.forEach((summary) => {
        messagesForApi.push({
          role: Role.SYSTEM,
          content: `Summary of previous conversation context (from ${summary.start_message_id} to ${summary.end_message_id}):\n${summary.content}`,
        });
    });

    let recentMessagesToInclude = this.messages;
    if (this.lastSummarizedMessageId) {
        const lastIdx = this.messages.findIndex(m => m.id === this.lastSummarizedMessageId);
        if (lastIdx > -1) {
            recentMessagesToInclude = this.messages.slice(lastIdx + 1);
        }
    }
    
    recentMessagesToInclude.forEach((msg) => {
        messagesForApi.push({
          role: msg.role,
          content: msg.visibleContent,
          attachments: msg.attachments,
        });
    });

    const botMessage = createMessage({
        role: Role.ASSISTANT,
        streaming: true,
        model: modelConfig.name,
        syncState: MessageSyncState.PENDING_CREATE,
    });
    this.messages.push(botMessage);
    const localBotMessageId = botMessage.id;
    
    const llmChatConfig: LLMConfig = {
        model: modelConfig.name,
        temperature: modelConfig.temperature,
        top_p: modelConfig.top_p,
        stream: true,
        reasoning: modelConfig.reasoning,
        targetEndpoint: modelConfig.endpoint,
        useSearch: userMessage.useSearch,
        customizedPrompts: this.customizedPrompts ? this.encryptionService.decrypt(JSON.stringify(this.customizedPrompts)) : undefined,
    };

    await this.api.llm.chat({
        messages: messagesForApi,
        config: llmChatConfig,
        onReasoningStart: () => {
            this.messages = this.messages.map(m => {
                return m.id === localBotMessageId
                ? {
                    ...m,
                    isReasoning: true,
                }
                : m;
            });
            this.updateState();
            options.onReasoningStart?.(localBotMessageId);
        },
        onReasoningChunk: (_id, chunk) => {
            this.messages = this.messages.map(m => {
                return m.id === localBotMessageId
                ? {
                    ...m,
                    visibleReasoning: (m.visibleReasoning || "") + chunk,
                }
                : m;
            });
            this.updateState();
            options.onReasoningChunk?.(localBotMessageId, chunk);
        },
        onReasoningEnd: () => {
            this.messages = this.messages.map(msg => {
              return msg.id === localBotMessageId
              ? {
                  ...msg,
                  isReasoning: false,
                  reasoning: this.encryptionService.encrypt(msg.visibleReasoning ?? ""),
                }
              : msg;
            });
            this.updateState();
            options.onReasoningEnd?.(localBotMessageId);
        },
        onContentChunk: (_id, chunk) => {
            this.messages = this.messages.map(msg => {
              return msg.id === localBotMessageId
              ? {
                  ...msg,
                  visibleContent: (msg.visibleContent || "") + chunk,
                  streaming: true,
                  isReasoning: false,
                }
              : msg;
            });
            this.updateState();
            options.onContentChunk?.(localBotMessageId, chunk);
        },
        onFinish: (finalContent, timestamp) => {
            this._finalizeMessage(localBotMessageId, finalContent, timestamp);
            options.onSuccess?.(localBotMessageId, finalContent, timestamp);
        },
        onError: (error) => {
            this._finalizeMessage(localBotMessageId, "", new Date(), true, error.message);
            options.onFailure?.(error);
        },
    });
  }

  private _finalizeMessage(messageId: UUID, finalContent: string, timestamp: Date, isError: boolean = false, errorMessage?: string) {
    let messageToSave: ChatMessage | undefined;

    this.messages = this.messages.map(msg => {
      if (msg.id === messageId) {
        const updatedMsg = { ...msg, streaming: false };

        if (isError) {
          updatedMsg.isError = true;
          updatedMsg.errorMessage = errorMessage;
        } else {
          updatedMsg.content = this.encryptionService.encrypt(finalContent);
          updatedMsg.visibleContent = finalContent;
          updatedMsg.date = timestamp;
          updatedMsg.syncState = MessageSyncState.SYNCED;
        }
        
        messageToSave = updatedMsg;
        return updatedMsg;
      }
      return msg;
    });

    if (messageToSave) {
      this.storage.saveMessage(this.id as string, messageToSave);
    } else {
      console.error(
        `[SDK-Chat] _finalizeMessage: Message with ID ${messageId} not found. Cannot save to server.`,
      );
    }

    this.updateState();
  }

  getState() {
    return this.state;
  }
}
