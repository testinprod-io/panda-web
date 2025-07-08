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
  FileWithProgress,
} from "@/types";
import {
  FileInfo,
  GetConversationMessagesParams,
  Summary,
  MessageCreateRequest,
  ServerModelInfo,
  ConversationUpdateRequest,
  SummaryCreateRequest,
  MultimodalContent,
  LLMConfig,
} from "@/sdk/client/types";
// import { mapApiMessagesToChatMessages } from "@/services/api-service";
import { EventBus } from "./events";
import { IStorage } from "./storage/i-storage";
import { EncryptionService } from "./EncryptionService";
import { ChallengeResponse } from "@/sdk/client/panda-challenge";
import { AttestationManager } from "./AttestationManager";
import { ConfigManager } from "./ConfigManager";
import Locale from "@/locales";
export class Chat {
  private bus: EventBus;
  private encryptionService: EncryptionService;
  private config: ConfigManager;

  public readonly id: UUID;
  public title: string = "";
  public encryptedTitle: string;
  public messages: ChatMessage[];
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

  get defaultModelName(): string | undefined {
    return this.customData?.default_model_name as string | undefined;
  }

  set defaultModelName(modelName: string | undefined) {
    this.customData = {
      ...this.customData,
      default_model_name: modelName,
    };
  }

  get customizedPromptsData(): string | undefined {
    return this.customData?.customized_prompts as string | undefined;
  }

  // set customizedPromptsData (data: string | undefined) {
  //   this.customData = {
  //     ...this.customData,
  //     customized_prompts: data,
  //   };
  // }

  constructor(
    bus: EventBus,
    api: ApiService,
    authManager: AuthManager,
    encryptionService: EncryptionService,
    storage: IStorage,
    config: ConfigManager,
    id: UUID,
    encryptedTitle: string,
    updatedAt: number,
    createdAt: number,
    customData?: Record<string, any>
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.storage = storage;
    this.encryptionService = encryptionService;
    this.config = config;
    this.id = id;
    this.encryptedTitle = encryptedTitle;
    this.customData = customData ?? {};
    this.messages = [];
    this.state = this.buildState();
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;

    this.bus.on("app.unlocked", () => {
      this.messages.forEach((m) => {
        m.visibleReasoning = m.reasoning
          ? this.encryptionService.decrypt(m.reasoning)
          : undefined;
        m.visibleContent = this.encryptionService.decrypt(m.content);
      });
      this.updateState();
    });

    this.bus.on("app.locked", () => {
      this.messages.forEach((m) => {
        m.visibleReasoning = m.reasoning;
        m.visibleContent = m.content;
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
    this.bus.emit(`chat.updated:${this.id}`, undefined);
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
        m.visibleReasoning = m.reasoning
          ? this.encryptionService.decrypt(m.reasoning)
          : undefined;
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
    if (!this.nextMessageCursor) return;

    console.log(
      `[SDK-Chat] Loading more messages for ${this.id}, cursor: ${this.nextMessageCursor}`
    );
    this.isLoading = true;
    this.updateState();

    try {
      const result = await this.storage.listMessages(
        this.id as string,
        this.nextMessageCursor,
        20
      );

      const olderMessages = result.messages.map((m) => {
        m.visibleReasoning = m.reasoning
          ? this.encryptionService.decrypt(m.reasoning)
          : undefined;
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

  private getModelConfig(): ServerModelInfo {
    const modelNameToUse =
      this.defaultModelName ?? this.config.getConfig().defaultModel?.model_name;
    if (!modelNameToUse) {
      throw new Error("No model selected for chat and no default model set.");
    }
    const modelConfig = this.config
      .getConfig()
      .models.find((m) => m.model_name === modelNameToUse);
    if (!modelConfig) {
      throw new Error(`Model ${modelNameToUse} not found in available models.`);
    }
    return modelConfig;
  }

  public async sendMessage(
    userInput: string,
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
          attachments.push({
            type: "image_url",
            image_url: { url: attachedFile.url },
          });
          files.push({
            file_id: attachedFile.fileId,
            file_name: attachedFile.name,
            file_type: "image",
            file_size: attachedFile.size,
          });
        } else if (attachedFile.type.startsWith("application/pdf")) {
          attachments.push({
            type: "pdf_url",
            pdf_url: { url: attachedFile.url },
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
    userMessage.syncState = MessageSyncState.SYNCED;
    console.log("userMessage", userMessage);
    this.messages.push(userMessage);
    this.updateState();

    this._sendMessages(this.getModelConfig(), options);
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

    let reasoningStartTimeForThisQuery: number | null = null;
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
      customizedPrompts: this.customizedPromptsData
        ? this.encryptionService.decrypt(this.customizedPromptsData)
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
        reasoningStartTimeForThisQuery = Date.now();
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
        let duration = 0;
        if (reasoningStartTimeForThisQuery !== null) {
          duration = Date.now() - reasoningStartTimeForThisQuery;
          reasoningStartTimeForThisQuery = null;
        }
        this.messages = this.messages.map((msg) => {
          return msg.id === localBotMessageId
            ? {
                ...msg,
                isReasoning: false,
                reasoning: this.encryptionService.encrypt(
                  msg.visibleReasoning ?? ""
                ),
                reasoningTime: duration,
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

  private async _triggerSummarization() {
    if (this.isSummarizing) {
      return;
    }
    console.log(
      "[SDK-Chat] Triggering summarization",
      this.lastSummarizedMessageId
    );
    const SUMMARIZE_INTERVAL = 10;
    let messagesToConsiderForSummarization: ChatMessage[];

    if (this.lastSummarizedMessageId) {
      const lastSummarizedMsgIndex = this.messages.findIndex(
        (msg: ChatMessage) => msg.id === this.lastSummarizedMessageId
      );
      if (lastSummarizedMsgIndex !== -1) {
        messagesToConsiderForSummarization = this.messages.slice(
          lastSummarizedMsgIndex + 1
        );
      } else {
        console.warn(
          `[SDK-Chat] Summarization Trigger: lastSummarizedMessageId ${this.lastSummarizedMessageId} not found in messages. Considering all messages.`
        );
        messagesToConsiderForSummarization = this.messages;
      }
    } else {
      messagesToConsiderForSummarization = this.messages;
    }
    console.log(
      "messagesToConsiderForSummarization",
      messagesToConsiderForSummarization
    );
    const finalMessagesToConsider = messagesToConsiderForSummarization.filter(
      (msg: ChatMessage) =>
        msg.syncState === MessageSyncState.SYNCED && !msg.isError
    );
    console.log("finalMessagesToConsider", finalMessagesToConsider);
    if (finalMessagesToConsider.length >= SUMMARIZE_INTERVAL) {
      console.log("[SDK-Chat] Summarizing", finalMessagesToConsider.length);
      const batchToSummarize = finalMessagesToConsider.slice(
        0,
        SUMMARIZE_INTERVAL
      );

      console.log(
        `[SDK-Chat] Triggering summarization with ${batchToSummarize.length} messages.`
      );
      this.isSummarizing = true;
      try {
        const modelConfig = this.getModelConfig();
        const summarizationConfig: LLMConfig = {
          model: modelConfig.name,
          temperature: 0.7,
          top_p: 1,
          reasoning: false,
          stream: false,
          targetEndpoint: modelConfig.url,
        };
        const summaryResponse = await this.api.llm.summary(
          summarizationConfig,
          batchToSummarize.map((msg) => ({
            role: msg.role,
            content: msg.visibleContent,
            attachments: msg.attachments,
          }))
        );
        const summaryCreateRequest: SummaryCreateRequest = {
          start_message_id: batchToSummarize[0].id,
          end_message_id: batchToSummarize[batchToSummarize.length - 1].id,
          content: this.encryptionService.encrypt(summaryResponse.summary),
        };
        const newSummary = await this.storage.saveSummary(
          this.id as string,
          summaryCreateRequest
        );
        newSummary.content = this.encryptionService.decrypt(newSummary.content);
        if (newSummary) {
          this.summaries.push(newSummary);
          this.summaries.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          this.lastSummarizedMessageId = newSummary.end_message_id;
        }
      } catch (error) {
        console.error("[SDK-Chat] Error during summarization:", error);
      } finally {
        this.isSummarizing = false;
      }
    }
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
    console.log("messageToSave", messageToSave);
    if (messageToSave) {
      this.storage.saveMessage(this.id as string, messageToSave);
    } else {
      console.error(
        `[SDK-Chat] _finalizeMessage: Message with ID ${messageId} not found. Cannot save to server.`
      );
    }

    this.updateState();

    if (!isError) {
      this._triggerSummarization();

      if (this.messages.length === 2) {
        this.generateSessionTitle(
          this.messages[0].visibleContent,
          this.messages[1].visibleContent
        );
      }
    }
  }

  private async generateSessionTitle(
    userMessageContent: string,
    assistantMessageContent: string
  ) {
    const defaultTopic = Locale.Store.DefaultTopic
    if (this.title !== defaultTopic) {
      console.log(
        `[Title Generation Action] Session already has a title, skipping.`
      );
      return;
    }

    // Model for Title Generation (adapts original store's getSummarizeModelConfig)
    const modelConfig = this.getModelConfig();
    const llmConfig: LLMConfig = {
      model: modelConfig.name,
      temperature: 0.3,
      top_p: 1,
      stream: false,
      reasoning: false,
      targetEndpoint: modelConfig.url,
    };

    const prompt = `**Prompt**\n\nYou are a chat‑title generator.\n\nInput\nUser: ${userMessageContent}\nAssistant: ${assistantMessageContent}\n\nTask\n1. If the messages revolve around a specific topic, produce a short, informative title (3–6 words, Title Case, no trailing punctuation).\n2. If they are too vague or empty to summarize meaningfully, output exactly:\n   ${defaultTopic}\n\nRules\n- Output **only** the title text (or "${defaultTopic}")—no extra words or quotation marks.\n- Keep the title neutral and descriptive; do not include the words "user" or "assistant".\n`;

    try {
      await this.api.llm.chat({
        messages: [
          {
            role: Role.USER,
            content: prompt,
          },
        ],
        config: llmConfig,
        onFinish: (finalContent, timestamp, _, challengeResponse) => {
          const encryptedTitle = this.encryptionService.encrypt(finalContent);
          console.log(
            `[Title Generation Action] LLM generated title: "${finalContent}"`
          );

          // Update local state only if the title is new and not the default
          if (finalContent !== defaultTopic && finalContent !== this.title) {
            this.title = finalContent;
            this.encryptedTitle = encryptedTitle;
            console.log(
              `[Title Generation Action] Updated local topic to: "${finalContent}"`
            );
            this.updateState();

            console.log(
              `[Title Generation Action] Attempting to update server title for ConvID: ${this.id}`
            );
            const updateReq: ConversationUpdateRequest = {
              title: encryptedTitle,
            };
            this.api.app.updateConversation(this.id, updateReq);
          } else {
            console.log(
              `[Title Generation Action] Generated title is default or unchanged, not updating.`
            );
          }
        },
      });
    } catch (error) {
      console.log(`[Title Generation Action] LLM API call failed:`, error);
    }
  }

  public async resendMessage(messageId: UUID) {
    const resendingIndex = this.messages.findIndex((m) => m.id === messageId);
    if (resendingIndex <= 0) return;

    await this.clearMessages(messageId);
    try {
      await this._sendMessages(this.getModelConfig(), {
        onReasoningStart: () => {},
        onReasoningChunk: (_id, _chunk) => {},
        onReasoningEnd: () => {},
        onContentChunk: (_id, _chunk) => {},
        onSuccess: () => {},
        onFailure: () => {},
      });
    } catch (error) {
      console.error("[ChatComponent] Failed resend query", error);
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

  public async setDefaultModelForChat(modelName: string) {
    this.defaultModelName = modelName;
    const updateRequest: ConversationUpdateRequest = {
      title: this.encryptedTitle,
      custom_data: this.customData,
    };
    await this.storage.updateChat(this.id as string, updateRequest);
    this.updateState();
  }
}
