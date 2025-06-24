import { UUID } from "crypto";
import { ApiService } from "./api";
import { AuthManager } from "./AuthManager";
import {
  ChatMessage,
  createMessage,
  Role,
  MessageSyncState,
  CustomizedPromptsData,
  SubmittedFile,
} from "@/types";
import {
  FileInfo,
  GetConversationMessagesParams,
  Summary,
  MessageCreateRequest,
  ServerModelInfo,
} from "@/client/types";
import { MultimodalContent, LLMConfig } from "@/client/api";
import { mapApiMessagesToChatMessages } from "@/services/api-service";
import { EventBus } from "./events";
import { IStorage } from "./storage/i-storage";
import { EncryptionService } from "./EncryptionService";
import { ChallengeResponse } from "@/client/platforms/panda-challenge";

export class Chat {
  private bus: EventBus;
  private encryptionService: EncryptionService;

  public readonly id: UUID;
  public title: string = "";
  public encryptedTitle: string;
  public messages: ChatMessage[];
  public modelConfig?: ServerModelInfo;
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
  
  public customData?: Record<string, any>;
  
  get customizedPromptsData (): CustomizedPromptsData | undefined {
    return this.customData?.customizedPrompts as CustomizedPromptsData | undefined;
  }

  set customizedPromptsData (data: CustomizedPromptsData | undefined) {
    this.customData = {
      ...this.customData,
      customizedPrompts: data,
    };
  }

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
    modelConfig?: ServerModelInfo,
    customData?: Record<string, any>,
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.storage = storage;
    this.encryptionService = encryptionService;
    this.id = id;
    this.encryptedTitle = encryptedTitle;
    this.modelConfig = modelConfig;
    this.customData = customData ?? {};
    this.messages = [];
    this.state = this.buildState();
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;

    this.bus.on("app.unlocked", () => {
      this.messages.forEach((m) => {
        m.visibleContent = this.encryptionService.decrypt(m.visibleContent);
      });
      this.updateState();
    });

    this.bus.on("app.locked", () => {
      this.messages.forEach((m) => {
        m.visibleContent = m.visibleContent;
      });
      this.updateState();
    });

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
    this.bus.emit("chat.updated", undefined);
  }
  /**
   * Performs the initial load of messages and summaries for this chat.
   * Adapted from the initial useEffect in useChatSessionManager.
   */
  public async loadInitial() {
    if (this.isLoading) return;
    console.log(
      `[SDK-Chat] Initializing message and summary load for chat ${this.id}.`
    );
    this.isLoading = true;
    this.updateState();

    try {
      const [messagesResult, summariesResult] = await Promise.all([
        this.storage.listMessages(this.id as string, undefined, 20),
        this.storage.getSummaries(this.id as string),
      ]);

      // Process messages
      this.messages = messagesResult.messages.map((m) => {
        m.visibleContent = this.encryptionService.decrypt(m.visibleContent);
        return m;
      });
      this.hasMoreMessages = messagesResult.hasMore;
      this.nextMessageCursor = messagesResult.nextCursor;

      // Process summaries
      const sortedSummaries = [...summariesResult].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

      console.log(
        `[SDK-Chat] Initial load complete. Messages: ${this.messages.length}, Summaries: ${this.summaries.length}`
      );
    } catch (error) {
      console.error(
        `[SDK-Chat] Error loading initial data for chat ${this.id}:`,
        error
      );
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

    console.log(
      `[SDK-Chat] Loading more messages for ${this.id}, cursor: ${this.nextMessageCursor}`
    );
    this.isLoading = true;
    this.updateState();

    try {
      const result = await this.storage.listMessages(
        this.id as string,
        this.nextMessageCursor ?? undefined,
        20
      );

      const olderMessages = result.messages.map((m) => {
        m.visibleContent = this.encryptionService.decrypt(m.visibleContent);
        return m;
      });

      this.messages = [...olderMessages, ...this.messages];

      this.hasMoreMessages = result.hasMore;
      this.nextMessageCursor = result.nextCursor;
      console.log(
        `[SDK-Chat] Loaded ${olderMessages.length} more messages. Total now: ${this.messages.length}.`
      );
    } catch (error) {
      console.error(
        `[SDK-Chat] Error loading more messages for chat ${this.id}:`,
        error
      );
    } finally {
      this.isLoading = false;
      this.updateState();
    }
  }

  public async sendMessage(
    userInput: string,
    defaultModelConfig: ServerModelInfo,
    userAttachments: SubmittedFile[],
    options: {
      enableSearch?: boolean;
      onReasoningStart?: (messageId: UUID) => void;
      onReasoningChunk?: (messageId: UUID, reasoningChunk: string) => void;
      onReasoningEnd?: (messageId: UUID) => void;
      onContentChunk?: (messageId: UUID, contentChunk: string) => void;
      onSuccess?: (
        messageId: UUID,
        finalMessage: string,
        timestamp: Date
      ) => void;
      onFailure?: (error: Error) => void;
    }
  ) {
    let files: FileInfo[] = [];
    let attachments: MultimodalContent[] = [];
    if (userAttachments && userAttachments.length > 0) {
      for (const attachedFile of userAttachments) {
        if (attachedFile.type.startsWith("image/")) {
          // Assuming Panda API format based on user request
          attachments.push({
            type: "image_url",
            image_url: { url: attachedFile.url }, // file.url is already the base64 data URI
          });
          files.push({
            file_id: attachedFile.fileId,
            file_name: attachedFile.name,
            file_type: "image",
            file_size: attachedFile.size,
          });
        } else if (attachedFile.type.startsWith("application/pdf")) {
          // Assuming Panda API format based on user request
          attachments.push({
            type: "pdf_url",
            pdf_url: { url: attachedFile.url }, // file.url is already the base64 data URI
          });
          files.push({
            file_id: attachedFile.fileId,
            file_name: attachedFile.name,
            file_type: "pdf",
            file_size: attachedFile.size,
          });
        } else {
          console.warn(
            `File ${attachedFile.name} is not an image and will be ignored for Panda API multimodal content.`
          );
        }
      }
    }

    const userMessage = createMessage({
      role: Role.USER,
      content: this.encryptionService.encrypt(userInput),
      visibleContent: userInput,
      attachments: attachments,
      files: files,
      useSearch: options.enableSearch ?? false,
      syncState: MessageSyncState.PENDING_CREATE,
    });
    await this.storage.saveMessage(this.id as string, userMessage);
    this.messages.push(userMessage);
    this.updateState();
    this._sendMessages(this.modelConfig ?? defaultModelConfig, options);
  }

  private async _sendMessages(
    modelConfig: ServerModelInfo,
    options: {
      enableSearch?: boolean;
      onReasoningStart?: (messageId: UUID) => void;
      onReasoningChunk?: (messageId: UUID, reasoningChunk: string) => void;
      onReasoningEnd?: (messageId: UUID) => void;
      onContentChunk?: (messageId: UUID, contentChunk: string) => void;
      onSuccess?: (
        messageId: UUID,
        finalMessage: string,
        timestamp: Date
      ) => void;
      onFailure?: (error: Error) => void;
    }
  ) {
    let messagesForApi: any[] = [];
    this.summaries.forEach((summary) => {
      messagesForApi.push({
        role: Role.SYSTEM,
        content: `Summary of previous conversation context (from ${summary.start_message_id} to ${summary.end_message_id}):\n${summary.content}`,
      });
    });

    let recentMessagesToInclude = this.messages;
    if (this.lastSummarizedMessageId) {
      const lastIdx = this.messages.findIndex(
        (m) => m.id === this.lastSummarizedMessageId
      );
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
      temperature: 0.7,
      top_p: 1,
      stream: true,
      reasoning: true,
      targetEndpoint: modelConfig.url,
      useSearch: options.enableSearch ?? false,
      customizedPrompts: this.customizedPrompts
        ? this.encryptionService.decrypt(JSON.stringify(this.customizedPrompts))
        : undefined,
    };

    await this.api.llm.chat({
      messages: messagesForApi,
      config: llmChatConfig,
      onReasoningStart: () => {
        this.messages = this.messages.map((m) => {
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
        const messageIndex = this.messages.findIndex(
          (m) => m.id === localBotMessageId
        );
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          const messageToUpdate = updatedMessages[messageIndex];
          updatedMessages[messageIndex] = {
            ...messageToUpdate,
            visibleReasoning: (messageToUpdate.visibleReasoning || "") + chunk,
          };
          this.messages = updatedMessages;
          this.updateState();
        }
        options.onReasoningChunk?.(localBotMessageId, chunk);
      },
      onReasoningEnd: () => {
        this.messages = this.messages.map((msg) => {
          return msg.id === localBotMessageId
            ? {
                ...msg,
                isReasoning: false,
                reasoning: this.encryptionService.encrypt(
                  msg.visibleReasoning ?? ""
                ),
              }
            : msg;
        });
        this.updateState();
        options.onReasoningEnd?.(localBotMessageId);
      },
      onContentChunk: (_id, chunk) => {
        const messageIndex = this.messages.findIndex(
          (m) => m.id === localBotMessageId
        );
        if (messageIndex !== -1) {
          const updatedMessages = [...this.messages];
          const messageToUpdate = updatedMessages[messageIndex];
          updatedMessages[messageIndex] = {
            ...messageToUpdate,
            visibleContent: (messageToUpdate.visibleContent || "") + chunk,
            streaming: true,
            isReasoning: false,
          };
          this.messages = updatedMessages;
          this.updateState();
        }
        options.onContentChunk?.(localBotMessageId, chunk);
      },
      onFinish: (finalContent, timestamp, _, challengeResponse) => {
        this._finalizeMessage(
          localBotMessageId,
          finalContent,
          timestamp,
          false,
          undefined,
          challengeResponse
        );
        options.onSuccess?.(localBotMessageId, finalContent, timestamp);
      },
      onError: (error) => {
        this._finalizeMessage(
          localBotMessageId,
          "",
          new Date(),
          true,
          error.message
        );
        options.onFailure?.(error);
      },
    });
  }

  private _finalizeMessage(
    messageId: UUID,
    finalContent: string,
    timestamp: Date,
    isError: boolean = false,
    errorMessage?: string,
    challengeResponse?: ChallengeResponse
  ) {
    let messageToSave: ChatMessage | undefined;

    this.messages = this.messages.map((msg) => {
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
          updatedMsg.challengeResponse = challengeResponse;
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
        `[SDK-Chat] _finalizeMessage: Message with ID ${messageId} not found. Cannot save to server.`
      );
    }

    this.updateState();
  }

  public async resendMessage(messageId: UUID, defaultModelConfig: ServerModelInfo) {
    const resendingIndex = this.messages.findIndex((m) => m.id === messageId);
    if (resendingIndex <= 0) return;

    await this.clearMessages(messageId);
    try {
      await this._sendMessages(this.modelConfig ??defaultModelConfig, {
        onReasoningStart: () => {},
        onReasoningChunk: (chunk: string) => {},
        onReasoningEnd: () => {},
        onContentChunk: (chunk: string) => {},
        onSuccess: () => {},
      });
    } catch (error) {
      console.error("[ChatComponent] Failed resend query", error);
      // setIsChatComponentBusy(false);
      // showSnackbar(Locale.Store.Error, "error");
      // reject(error);
    }
  }

  public async clearMessages(messageId: UUID) {
    const clearIndex = this.messages.findIndex((m) => m.id === messageId);
    if (clearIndex <= 0) return;

    const messagesToClear = this.messages.slice(clearIndex);
    this.storage.deleteMessages(
      this.id as string,
      messagesToClear.map((m) => m.id as string)
    );
    this.messages = this.messages.slice(0, clearIndex);
    this.updateState();
  }

  getState() {
    return this.state;
  }

  public async updateModelConfig(modelConfig: ServerModelInfo) {
    this.modelConfig = modelConfig;
    this.storage.updateChat(this);
    this.updateState();
  }
}
