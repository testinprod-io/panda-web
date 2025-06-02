import type { ClientApi, RequestMessage } from "@/client/api";
import {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  GetConversationMessagesParams,
  Message as ApiMessage,
  MessageCreateRequest,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  GetConversationsParams,
} from "@/client/types";
import { UUID } from "crypto";
import { ChatMessage, createMessage, Role } from "@/types/chat";
import { ChatSession, createNewSession } from "@/types/session";
import { ModelConfig } from "@/types/constant";
import { DEFAULT_TOPIC } from "@/store/chat";
import { trimTopic } from "@/utils/utils";
import { EncryptionService } from "@/services/encryption-service";
import { LLMConfig } from "@/client/api";

function decryptConversationData(conversation: Conversation): Conversation {
  const decryptedConvo = { ...conversation };

  if (decryptedConvo.title) {
    try {
      decryptedConvo.title = EncryptionService.decrypt(decryptedConvo.title);
    } catch (err) {
      decryptedConvo.title = "Invalid password";
      console.error(
        "[ChatApiService] Error decrypting conversation title:",
        err,
      );
    }
  }

  return decryptedConvo;
}

type MessageWithContent = {
  content: string;
  reasoning_content?: string;
  reasoning_time?: string;
  [key: string]: any;
};

function decryptMessageData<T extends MessageWithContent>(message: T): T {
  const decryptedMsg = { ...message };

  if (decryptedMsg.content) {
    try {
      decryptedMsg.content = EncryptionService.decrypt(decryptedMsg.content);
    } catch (err) {
      console.error("[ChatApiService] Error decrypting message content:", err);
    }
  }

  if (decryptedMsg.reasoning_content) {
    try {
      decryptedMsg.reasoning_content = EncryptionService.decrypt(
        decryptedMsg.reasoning_content,
      );
    } catch (err) {
      console.error(
        "[ChatApiService] Error decrypting message reasoning content:",
        err,
      );
    }
  }

  return decryptedMsg;
}

export function mapConversationToSession(
  conversation: Conversation,
): ChatSession {
  const decryptedConvo = decryptConversationData(conversation);

  const session = createNewSession(decryptedConvo.conversation_id);
  session.topic = conversation.title || DEFAULT_TOPIC;
  session.visibleTopic = decryptedConvo.title || DEFAULT_TOPIC;
  session.lastUpdate = new Date(decryptedConvo.updated_at).getTime();
  session.customizedPrompts = EncryptionService.decrypt(decryptedConvo.custom_data?.customized_prompts);
  return session;
}

export function mapApiMessagesToChatMessages(
  messages: ApiMessage[],
): ChatMessage[] {
  return messages.map((msg) => mapApiMessageToChatMessage(msg));
}

export function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage {
  const decryptedMsg = decryptMessageData(message);

  return createMessage({
    id: message.message_id,
    role: message.sender_type,
    content: message.content,
    visibleContent: message.content,
    files: message.files,
    date: new Date(message.timestamp),
    reasoning: message.reasoning_content,
    reasoningTime: message.reasoning_time
      ? parseInt(message.reasoning_time)
      : undefined,
    useSearch: message.custom_data?.useSearch ?? false,
  });
}

export const ChatApiService = {
  async fetchConversations(
    api: ClientApi,
    params: GetConversationsParams,
  ): Promise<PaginatedConversationsResponse> {
    console.log("[ChatApiService] Fetching conversations:", params);
    try {
      const response = await api.app.getConversations(params);
      console.log(
        `[ChatApiService] Received ${response.data.length} conversations.`,
      );

      // Decrypt conversation data
      const decryptedData = response.data.map((convo) =>
        decryptConversationData(convo),
      );

      // Create a new response with decrypted data
      const decryptedResponse = {
        ...response,
        data: decryptedData,
      };

      return decryptedResponse;
    } catch (error) {
      console.error("[ChatApiService] Failed to fetch conversations:", error);
      throw error; // Re-throw to be handled by the caller
    }
  },

  async createConversation(
    api: ClientApi,
    createRequest: ConversationCreateRequest,
  ): Promise<Conversation> {
    console.log("[ChatApiService] Creating conversation:", createRequest);
    try {
      const newConversation = await api.app.createConversation(createRequest);
      console.log(
        "[ChatApiService] Conversation created:",
        newConversation.conversation_id,
      );
      return newConversation;
    } catch (error) {
      console.error("[ChatApiService] Failed to create conversation:", error);
      throw error;
    }
  },

  async updateConversation(
    api: ClientApi,
    id: UUID,
    updateRequest: ConversationUpdateRequest,
  ): Promise<Conversation> {
    console.log(`[ChatApiService] Updating conversation ${id}:`, updateRequest);
    try {
      const updatedConversation = await api.app.updateConversation(
        id,
        updateRequest,
      );
      console.log(`[ChatApiService] Conversation ${id} updated.`);
      return updatedConversation;
    } catch (error) {
      console.error(
        `[ChatApiService] Failed to update conversation ${id}:`,
        error,
      );
      throw error;
    }
  },

  async deleteConversation(api: ClientApi, id: UUID): Promise<void> {
    console.log(`[ChatApiService] Deleting conversation ${id}`);
    try {
      await api.app.deleteConversation(id);
      console.log(`[ChatApiService] Conversation ${id} deleted.`);
    } catch (error) {
      console.error(
        `[ChatApiService] Failed to delete conversation ${id}:`,
        error,
      );
      throw error;
    }
  },

  async fetchMessages(
    api: ClientApi,
    id: UUID,
    params?: GetConversationMessagesParams,
  ): Promise<PaginatedMessagesResponse> {
    console.log(
      `[ChatApiService] Fetching messages for conversation ${id}:`,
      params,
    );
    try {
      // Explicitly handle null cursor before calling API
      const apiParams: GetConversationMessagesParams = { ...params };
      if (apiParams.cursor === null) {
        delete apiParams.cursor; // Remove cursor property entirely if null
      }
      // Now apiParams.cursor is either string or undefined
      const response = await api.app.getConversationMessages(id, apiParams);
      console.log(
        `[ChatApiService] Received ${response.data.length} messages for ${id}.`,
      );

      // Decrypt the message data
      const decryptedData = response.data.map((msg) => decryptMessageData(msg));

      // Create a new response with decrypted data
      const decryptedResponse = {
        ...response,
        data: decryptedData,
      };

      return decryptedResponse;
    } catch (error) {
      console.error(
        `[ChatApiService] Failed to fetch messages for ${id}:`,
        error,
      );
      throw error;
    }
  },

  async createMessage(
    api: ClientApi,
    id: UUID,
    createRequest: MessageCreateRequest,
  ): Promise<ApiMessage> {
    console.log(
      `[ChatApiService] Creating message for conversation ${id}:`,
      createRequest.message_id,
    );
    try {
      // Encrypt the message content before sending to server
      // const encryptedRequest = encryptMessageData(createRequest) as MessageCreateRequest;
      const savedMessage = await api.app.createMessage(id, createRequest);
      console.log(
        `[ChatApiService] Message ${savedMessage.message_id} created successfully.`,
      );

      return savedMessage;
    } catch (error) {
      console.error(
        `[ChatApiService] Failed to create message ${createRequest.message_id}:`,
        error,
      );
      throw error;
    }
  },

  // Note: The LLM chat function needs careful handling of callbacks (onUpdate, onFinish, onError, onController)
  // This service might just initiate the call, but the orchestration of updates
  // might need to happen closer to the component or in the action layer.
  // For now, let's pass the callbacks through.
  async callLlmChat(
    api: ClientApi,
    args: {
      messages: RequestMessage[];
      config: ModelConfig & {
        stream?: boolean;
        useSearch?: boolean;
        customizedPrompts?: string;
      };
      onReasoningStart?: (messageId?: string) => void;
      onReasoningChunk?: (messageId: string | undefined, chunk: string) => void;
      onReasoningEnd?: (messageId?: string) => void;
      onContentChunk?: (messageId: string | undefined, chunk: string) => void;
      onFinish: (message: string, date: Date, responseRes?: any) => void;
      onError: (error: Error) => void;
      onController?: (controller: AbortController) => void;
    },
  ): Promise<void> {
    console.log("[ChatApiService] Calling LLM chat:", {
      messagesCount: args.messages.length,
      config: args.config,
    });
    try {
      const llmChatConfig: LLMConfig = {
        model: args.config.name,
        temperature: args.config.temperature,
        top_p: args.config.top_p,
        stream: args.config.stream ?? true,
        presence_penalty: args.config.presence_penalty,
        frequency_penalty: args.config.frequency_penalty,
        reasoning: args.config.reasoning ?? false,
        targetEndpoint: args.config.endpoint,
        useSearch: args.config.useSearch ?? false,
        customizedPrompts: args.config.customizedPrompts,
      };

      await api.llm.chat({
        messages: args.messages,
        config: llmChatConfig,
        onReasoningStart: args.onReasoningStart,
        onReasoningChunk: args.onReasoningChunk,
        onReasoningEnd: args.onReasoningEnd,
        onContentChunk: args.onContentChunk,
        onFinish: args.onFinish,
        onError: args.onError,
        onController: args.onController,
      });
      console.log("[ChatApiService] LLM chat call initiated.");
    } catch (error) {
      console.error(
        "[ChatApiService] Failed to initiate LLM chat call:",
        error,
      );
      args.onError(error as Error);
    }
  },

  // Wrapper for LLM chat specifically for summarizing (non-streaming)
  async callLlmSummarize(
    api: ClientApi,
    messages: RequestMessage[],
    config: ModelConfig,
  ): Promise<string> {
    console.log("[ChatApiService] Calling LLM summarize:", {
      messagesCount: messages.length,
      config,
    });
    return new Promise((resolve, reject) => {
      const llmSummarizeConfig: LLMConfig = {
        model: config.name,
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        reasoning: config.reasoning ?? false,
        stream: false,
        targetEndpoint: config.endpoint,
      };
      api.llm
        .summary(llmSummarizeConfig, messages, 1000)
        .then((response) => {
          console.log("[ChatApiService] LLM summarize finished successfully.");
          resolve(response.summary);
        })
        .catch((error) => {
          console.error("[ChatApiService] LLM summarize failed:", error);
          reject(error);
        });
    });
  },

  async callLlmGenerateTitle(
    api: ClientApi,
    prompt: string,
    config: ModelConfig,
  ): Promise<string> {
    console.log("[ChatApiService] Calling LLM generate title:", { config });
    return new Promise((resolve, reject) => {
      const llmTitleConfig: LLMConfig = {
        model: config.name,
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        reasoning: config.reasoning ?? false,
        stream: false,
        targetEndpoint: config.endpoint,
      };
      api.llm.chat({
        messages: [
          createMessage({
            role: Role.USER,
            content: prompt,
          }) as unknown as RequestMessage,
        ],
        config: llmTitleConfig,
        onFinish: (title, date, responseRes) => {
          if (responseRes?.status === 200) {
            const cleanedTitle =
              title && title.length > 0 ? trimTopic(title) : DEFAULT_TOPIC;
            console.log(
              `[ChatApiService] LLM generated title: "${cleanedTitle}"`,
            );
            resolve(cleanedTitle);
          } else {
            console.error(
              "[ChatApiService] LLM title generation finished with non-200 status:",
              responseRes?.status,
            );
            reject(
              new Error(
                `Title generation failed with status: ${responseRes?.status}`,
              ),
            );
          }
        },
        onError: (error) => {
          console.error("[ChatApiService] LLM title generation failed:", error);
          reject(error);
        },
      });
    });
  },
};
