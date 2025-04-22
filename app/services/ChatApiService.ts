import type {
  ClientApi,
  MultimodalContent,
  RequestMessage,
} from "@/app/client/api";
import {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  GetConversationMessagesParams,
  Message as ApiMessage,
  MessageCreateRequest,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  HTTPValidationError,
  SenderTypeEnum,
} from "@/app/client/types";
import { UUID } from "crypto";
import { ChatMessage, createMessage, MessageRole } from "@/app/types/chat";
import { ChatSession, createEmptySession } from "@/app/types/session";
import { ModelConfig, ModelType } from "@/app/store/config";
import Locale from "@/app/locales";
import { DEFAULT_TOPIC, BOT_HELLO } from "@/app/store/chat"; // Assuming these are exported from store
import { trimTopic, getMessageTextContent } from "@/app/utils"; // Import from utils

export function mapConversationToSession(conversation: Conversation): ChatSession {
  const session = createEmptySession();
  session.conversationId = conversation.conversation_id;
  session.topic = conversation.title || DEFAULT_TOPIC;
  session.lastUpdate = new Date(conversation.updated_at).getTime();
  session.messages = [BOT_HELLO];
  return session;
}

export function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage {
  const role: MessageRole = message.sender_type === SenderTypeEnum.USER ? "user" : "assistant";

  return createMessage({
    id: message.message_id,
    role: role,
    content: message.content,
    date: new Date(message.timestamp).toLocaleString(),
  });
}

export function mapRoleToSenderType(role: MessageRole): SenderTypeEnum {
    return role === "user" ? SenderTypeEnum.USER : SenderTypeEnum.SYSTEM;
}

export const ChatApiService = {
  async fetchConversations(
    api: ClientApi,
    params: { limit: number }
  ): Promise<PaginatedConversationsResponse> {
    console.log("[ChatApiService] Fetching conversations:", params);
    try {
      const response = await api.app.getConversations(params);
      console.log(`[ChatApiService] Received ${response.data.length} conversations.`);
      return response;
    } catch (error) {
      console.error("[ChatApiService] Failed to fetch conversations:", error);
      throw error; // Re-throw to be handled by the caller
    }
  },

  async createConversation(
    api: ClientApi,
    createRequest: ConversationCreateRequest
  ): Promise<Conversation> {
    console.log("[ChatApiService] Creating conversation:", createRequest);
    try {
      const newConversation = await api.app.createConversation(createRequest);
      console.log("[ChatApiService] Conversation created:", newConversation.conversation_id);
      return newConversation;
    } catch (error) {
      console.error("[ChatApiService] Failed to create conversation:", error);
      throw error;
    }
  },

  async updateConversation(
    api: ClientApi,
    conversationId: UUID,
    updateRequest: ConversationUpdateRequest
  ): Promise<Conversation> {
    console.log(`[ChatApiService] Updating conversation ${conversationId}:`, updateRequest);
    try {
      const updatedConversation = await api.app.updateConversation(conversationId, updateRequest);
      console.log(`[ChatApiService] Conversation ${conversationId} updated.`);
      return updatedConversation;
    } catch (error) {
      console.error(`[ChatApiService] Failed to update conversation ${conversationId}:`, error);
      throw error;
    }
  },

  async deleteConversation(
    api: ClientApi,
    conversationId: UUID
  ): Promise<void> {
    console.log(`[ChatApiService] Deleting conversation ${conversationId}`);
    try {
      await api.app.deleteConversation(conversationId);
      console.log(`[ChatApiService] Conversation ${conversationId} deleted.`);
    } catch (error) {
      console.error(`[ChatApiService] Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  },

  async fetchMessages(
    api: ClientApi,
    conversationId: UUID,
    params?: GetConversationMessagesParams
  ): Promise<PaginatedMessagesResponse> {
    console.log(`[ChatApiService] Fetching messages for conversation ${conversationId}:`, params);
    try {
      // Explicitly handle null cursor before calling API
      const apiParams: GetConversationMessagesParams = { ...params };
      if (apiParams.cursor === null) {
        delete apiParams.cursor; // Remove cursor property entirely if null
      }
      // Now apiParams.cursor is either string or undefined
      const response = await api.app.getConversationMessages(conversationId, apiParams);
      console.log(`[ChatApiService] Received ${response.data.length} messages for ${conversationId}.`);
      return response;
    } catch (error) {
      console.error(`[ChatApiService] Failed to fetch messages for ${conversationId}:`, error);
      throw error;
    }
  },

  async createMessage(
    api: ClientApi,
    conversationId: UUID,
    createRequest: MessageCreateRequest
  ): Promise<ApiMessage> {
    console.log(`[ChatApiService] Creating message for conversation ${conversationId}:`, createRequest.message_id);
    try {
      const savedMessage = await api.app.createMessage(conversationId, createRequest);
      console.log(`[ChatApiService] Message ${savedMessage.message_id} created successfully.`);
      return savedMessage;
    } catch (error) {
      console.error(`[ChatApiService] Failed to create message ${createRequest.message_id}:`, error);
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
      config: ModelConfig & { stream?: boolean };
      onUpdate: (message: string) => void;
      onFinish: (message: string, responseRes?: any) => void;
      onError: (error: Error) => void;
      onController?: (controller: AbortController) => void;
    }
  ): Promise<void> {
    console.log("[ChatApiService] Calling LLM chat:", { messagesCount: args.messages.length, config: args.config });
    try {
      // Assuming api.llm.chat handles the streaming and callbacks internally
      await api.llm.chat(args);
      console.log("[ChatApiService] LLM chat call initiated.");
    } catch (error) {
      console.error("[ChatApiService] Failed to initiate LLM chat call:", error);
      // We might call onError here directly if the initial call setup fails
      args.onError(error as Error);
      // Re-throwing might not be necessary if onError handles it
    }
  },

  // Wrapper for LLM chat specifically for summarizing (non-streaming)
  async callLlmSummarize(
    api: ClientApi,
    messages: RequestMessage[],
    config: ModelConfig,
    prompt: string
  ): Promise<string> {
    console.log("[ChatApiService] Calling LLM summarize:", { messagesCount: messages.length, config });
    return new Promise((resolve, reject) => {
      api.llm.chat({
        messages: messages.concat(createMessage({ role: "system", content: prompt, date: "" })),
        config: { ...config, stream: false }, // Ensure stream is false
        onUpdate: (msg) => { /* Summarize shouldn't stream */ },
        onFinish: (message, responseRes) => {
          if (responseRes?.status === 200) {
            console.log("[ChatApiService] LLM summarize finished successfully.");
            resolve(message);
          } else {
            console.error("[ChatApiService] LLM summarize finished with non-200 status:", responseRes?.status);
            reject(new Error(`Summarization failed with status: ${responseRes?.status}`));
          }
        },
        onError: (error) => {
          console.error("[ChatApiService] LLM summarize failed:", error);
          reject(error);
        },
      });
    });
  },

  // Wrapper for LLM chat specifically for generating titles (non-streaming)
  async callLlmGenerateTitle(
    api: ClientApi,
    prompt: string,
    config: ModelConfig
  ): Promise<string> {
    console.log("[ChatApiService] Calling LLM generate title:", { config });
    return new Promise((resolve, reject) => {
      api.llm.chat({
        messages: [createMessage({ role: "user", content: prompt })],
        config: { ...config, stream: false }, // Ensure stream is false
        onUpdate: (msg) => { /* Title generation shouldn't stream */ },
        onFinish: (title, responseRes) => {
          if (responseRes?.status === 200) {
            const cleanedTitle = title && title.length > 0 ? trimTopic(title) : DEFAULT_TOPIC;
            console.log(`[ChatApiService] LLM generated title: "${cleanedTitle}"`);
            resolve(cleanedTitle);
          } else {
            console.error("[ChatApiService] LLM title generation finished with non-200 status:", responseRes?.status);
            reject(new Error(`Title generation failed with status: ${responseRes?.status}`));
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