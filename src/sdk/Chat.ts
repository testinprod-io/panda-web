import { UUID } from 'crypto';
import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { ChatMessage, createMessage, Role, MessageSyncState, CustomizedPromptsData } from '@/types';
import { FileInfo, GetConversationMessagesParams, Summary, MessageCreateRequest } from '@/client/types';
import { MultimodalContent, LLMConfig } from '@/client/api';
import { mapApiMessagesToChatMessages } from '@/services/api-service';
import { ModelConfig } from '@/types/constant';
import { EventEmitter } from './events';

// This would be a proper import in the final version
const EncryptionService = {
  encrypt: (text: string) => text,
  decrypt: (text: string) => text,
};

export class Chat extends EventEmitter {
  public readonly id: UUID;
  public title: string;
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

  private state: {
    messages: ChatMessage[];
    isLoading: boolean;
    hasMoreMessages: boolean;
  };

  constructor(
    api: ApiService, 
    authManager: AuthManager, 
    id: UUID, 
    title: string,
    updatedAt: number,
    createdAt: number,
    modelConfig?: ModelConfig,
    customizedPrompts?: CustomizedPromptsData,
  ) {
    super();
    this.api = api;
    this.authManager = authManager;
    this.id = id;
    this.title = title;
    this.modelConfig = modelConfig;
    this.customizedPrompts = customizedPrompts;
    this.messages = [];
    this.state = this.buildState();
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
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
    this.emit('update');
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
            this.api.app.getConversationMessages(this.id as UUID, { limit: 20 }),
            this.api.app.getSummaries(this.id as UUID)
        ]);

        // Process messages
        const serverMessages = messagesResult.data.slice().reverse(); 
        const chatMessages = mapApiMessagesToChatMessages(serverMessages);
        this.messages = chatMessages;
        this.hasMoreMessages = messagesResult.pagination.has_more;
        this.nextMessageCursor = messagesResult.pagination.next_cursor;
        
        // Process summaries
        const sortedSummaries = [...summariesResult].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          sortedSummaries.forEach((summary) => {
            summary.content = EncryptionService.decrypt(summary.content);
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
        const result = await this.api.app.getConversationMessages(this.id as UUID, { limit: 20, cursor: this.nextMessageCursor });
        
        const olderMessages = mapApiMessagesToChatMessages(result.data.slice().reverse());
        this.messages = [...olderMessages, ...this.messages];

        this.hasMoreMessages = result.pagination.has_more;
        this.nextMessageCursor = result.pagination.next_cursor;
        console.log(`[SDK-Chat] Loaded ${olderMessages.length} more messages. Total now: ${this.messages.length}.`);

    } catch (error) {
        console.error(`[SDK-Chat] Error loading more messages for chat ${this.id}:`, error);
    } finally {
        this.isLoading = false;
        this.updateState();
    }
  }

  public async sendMessage(
    userInput: string,
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
    if(!this.modelConfig) {
      throw new Error("Model config is required");
    }
    const userMessage = createMessage({
        role: Role.USER,
        content: EncryptionService.encrypt(userInput),
        visibleContent: userInput,
        attachments: options.attachments,
        files: options.files,
        useSearch: options.enableSearch ?? false,
        syncState: MessageSyncState.PENDING_CREATE,
    });
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
        model: this.modelConfig.name,
        syncState: MessageSyncState.PENDING_CREATE,
    });
    this.messages.push(botMessage);
    const localBotMessageId = botMessage.id;
    
    const llmChatConfig: LLMConfig = {
        model: this.modelConfig.name,
        temperature: this.modelConfig.temperature,
        top_p: this.modelConfig.top_p,
        stream: true,
        reasoning: this.modelConfig.reasoning,
        targetEndpoint: this.modelConfig.endpoint,
        useSearch: userMessage.useSearch,
        customizedPrompts: this.customizedPrompts ? EncryptionService.decrypt(JSON.stringify(this.customizedPrompts)) : undefined,
    };

    await this.api.llm.chat({
        messages: messagesForApi,
        config: llmChatConfig,
        onReasoningStart: () => {
            const msg = this.messages.find(m => m.id === localBotMessageId);
            if (msg) msg.isReasoning = true;
            this.updateState();
            options.onReasoningStart?.(localBotMessageId);
        },
        onReasoningChunk: (_id, chunk) => {
            const msg = this.messages.find(m => m.id === localBotMessageId);
            if (msg) {
                msg.visibleReasoning = (msg.visibleReasoning || "") + chunk;
            }
            this.updateState();
            options.onReasoningChunk?.(localBotMessageId, chunk);
        },
        onReasoningEnd: () => {
             const msg = this.messages.find(m => m.id === localBotMessageId);
            if (msg) {
                msg.isReasoning = false;
                msg.reasoning = EncryptionService.encrypt(msg.visibleReasoning ?? "");
            }
            this.updateState();
            options.onReasoningEnd?.(localBotMessageId);
        },
        onContentChunk: (_id, chunk) => {
            const msg = this.messages.find(m => m.id === localBotMessageId);
            if (msg) {
                msg.visibleContent = (msg.visibleContent || "") + chunk;
            }
            this.updateState();
            options.onContentChunk?.(localBotMessageId, chunk);
        },
        onFinish: (finalContent, timestamp) => {
            this.finalizeMessage(localBotMessageId, finalContent, timestamp);
            options.onSuccess?.(localBotMessageId, finalContent, timestamp);
        },
        onError: (error) => {
            this.markMessageAsError(localBotMessageId, error.message);
            options.onFailure?.(error);
        },
    });
  }

  finalizeMessage(messageId: UUID, finalContent: string, timestamp: Date, isError: boolean = false, errorMessage?: string) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
        message.streaming = false;
        if(isError) {
            message.isError = true;
            message.errorMessage = errorMessage;
        } else {
            message.content = EncryptionService.encrypt(finalContent);
            message.visibleContent = finalContent;
            message.date = timestamp;
            message.syncState = MessageSyncState.SYNCED;
        }
        
        const request: MessageCreateRequest = {
            message_id: message.id,
            sender_type: message.role,
            content: message.content,
            files: message.files,
            custom_data: { useSearch: message.useSearch },
            reasoning_content: message.reasoning,
            reasoning_time: message.reasoningTime?.toString()
        };
        this.api.app.createMessage(this.id as UUID, request);
        this.updateState();
    }
  }

  markMessageAsError(messageId: UUID, error: string) {
      this.finalizeMessage(messageId, "", new Date(), true, error);
  }

  getState() {
    return this.state;
  }
}
