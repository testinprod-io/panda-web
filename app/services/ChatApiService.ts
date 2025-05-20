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
  GetConversationsParams,
} from "@/app/client/types";
import { UUID } from "crypto";
import { ChatMessage, createMessage, MessageRole } from "@/app/types/chat";
import { ChatSession, createNewSession } from "@/app/types/session";
import { ModelType } from "@/app/store/config";
import { ModelConfig } from "@/app/constant";
import Locale from "@/app/locales";
import { DEFAULT_TOPIC } from "@/app/store/chat"; // Assuming these are exported from store
import { trimTopic, getMessageTextContent } from "@/app/utils"; // Import from utils
import { EncryptionService } from "@/app/services/EncryptionService";
import { LLMConfig } from "@/app/client/api";

// Helper to encrypt/decrypt conversation data
function encryptConversationData(conversation: Conversation): Conversation {
  // Make a copy to avoid mutating the original
  const encryptedConvo = { ...conversation };
  
  // Only encrypt the title
  if (encryptedConvo.title) {
    try {
      encryptedConvo.title = EncryptionService.encrypt(encryptedConvo.title);
    } catch (err) {
      console.error("[ChatApiService] Error encrypting conversation title:", err);
      // Fall back to unencrypted but log the error
    }
  }
  
  return encryptedConvo;
}

function decryptConversationData(conversation: Conversation): Conversation {
  // Make a copy to avoid mutating the original
  const decryptedConvo = { ...conversation };
  
  // Decrypt title if it exists
  if (decryptedConvo.title) {
    try {
      decryptedConvo.title = EncryptionService.decrypt(decryptedConvo.title);
    } catch (err) {
      decryptedConvo.title = "Invalid password";
      console.error("[ChatApiService] Error decrypting conversation title:", err);
      // Keep the encrypted title if decryption fails
    }
  }
  
  return decryptedConvo;
}

// Type that can handle both ApiMessage and MessageCreateRequest
type MessageWithContent = {
  content: string
  reasoning_content?: string;
  reasoning_time?: string;
  [key: string]: any;
};

// Helper to encrypt/decrypt message data
function encryptMessageData<T extends MessageWithContent>(message: T): T {
  // Make a copy to avoid mutating the original
  const encryptedMsg = { ...message };
  
  // Encrypt content if it exists
  if (encryptedMsg.content) {
    try {
      encryptedMsg.content = EncryptionService.encryptChatMessageContent(encryptedMsg.content);
    } catch (err) {
      console.error("[ChatApiService] Error encrypting message content:", err);
      // Fall back to unencrypted but log the error
    }
  }

  if (encryptedMsg.reasoning_content) {
    try {
      encryptedMsg.reasoning_content = EncryptionService.encryptChatMessageContent(encryptedMsg.reasoning_content);
    } catch (err) {
      console.error("[ChatApiService] Error encrypting message content:", err);
      // Fall back to unencrypted but log the error
    }
  }

  return encryptedMsg;
}

function decryptMessageData<T extends MessageWithContent>(message: T): T {
  // Make a copy to avoid mutating the original
  const decryptedMsg = { ...message };
  
  // Decrypt content if it exists
  if (decryptedMsg.content) {
    try {
      decryptedMsg.content = EncryptionService.decryptChatMessageContent(decryptedMsg.content);
    } catch (err) {
      console.error("[ChatApiService] Error decrypting message content:", err);
      // Keep the encrypted content if decryption fails
    }
  }

  if (decryptedMsg.reasoning_content) {
    try {
      decryptedMsg.reasoning_content = EncryptionService.decryptChatMessageContent(decryptedMsg.reasoning_content);
    } catch (err) {
      console.error("[ChatApiService] Error decrypting message reasoning content:", err);
    }
  }
  
  return decryptedMsg;
}

export function mapConversationToSession(conversation: Conversation): ChatSession {
  // Decrypt the conversation first
  const decryptedConvo = decryptConversationData(conversation);
  
  const session = createNewSession(decryptedConvo.conversation_id);
  session.topic = decryptedConvo.title || DEFAULT_TOPIC;
  session.lastUpdate = new Date(decryptedConvo.updated_at).getTime();
  session.messages = [];
  return session;
}

export function mapApiMessagesToChatMessages(messages: ApiMessage[]): ChatMessage[] {
  return messages.map(msg => mapApiMessageToChatMessage(msg));
}

export function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage {
  // Decrypt the message first
  const decryptedMsg = decryptMessageData(message);
  
  const role: MessageRole = decryptedMsg.sender_type === SenderTypeEnum.USER ? "user" : "system";

  return createMessage({
    id: decryptedMsg.message_id,
    role: role,
    content: decryptedMsg.content,
    date: new Date(decryptedMsg.timestamp),
    reasoning: decryptedMsg.reasoning_content,
    reasoningTime: decryptedMsg.reasoning_time ? parseInt(decryptedMsg.reasoning_time) : undefined,
  });
}

export function mapRoleToSenderType(role: MessageRole): SenderTypeEnum {
    return role === "user" ? SenderTypeEnum.USER : SenderTypeEnum.SYSTEM;
}

export const ChatApiService = {
  async fetchConversations(
    api: ClientApi,
    params: GetConversationsParams
  ): Promise<PaginatedConversationsResponse> {
    console.log("[ChatApiService] Fetching conversations:", params);
    try {
      const response = await api.app.getConversations(params);
      console.log(`[ChatApiService] Received ${response.data.length} conversations.`);
      
      // Decrypt conversation data
      const decryptedData = response.data.map(convo => decryptConversationData(convo));
      
      // Create a new response with decrypted data
      const decryptedResponse = {
        ...response,
        data: decryptedData
      };
      
      return decryptedResponse;
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
      // Encrypt the conversation data before sending to server
      const encryptedRequest = { 
        ...createRequest,
        title: createRequest.title ? EncryptionService.encrypt(createRequest.title) : createRequest.title
      };
      
      const newConversation = await api.app.createConversation(encryptedRequest);
      console.log("[ChatApiService] Conversation created:", newConversation.conversation_id);
      
      // Decrypt the returned data
      const decryptedConversation = decryptConversationData(newConversation);
      
      return decryptedConversation;
    } catch (error) {
      console.error("[ChatApiService] Failed to create conversation:", error);
      throw error;
    }
  },

  async updateConversation(
    api: ClientApi,
    id: UUID,
    updateRequest: ConversationUpdateRequest
  ): Promise<Conversation> {
    console.log(`[ChatApiService] Updating conversation ${id}:`, updateRequest);
    try {
      // Encrypt the update data
      const encryptedRequest = { 
        ...updateRequest,
        title: updateRequest.title ? EncryptionService.encrypt(updateRequest.title) : updateRequest.title
      };
      
      const updatedConversation = await api.app.updateConversation(id, encryptedRequest);
      console.log(`[ChatApiService] Conversation ${id} updated.`);
      
      // Decrypt the returned data
      const decryptedConversation = decryptConversationData(updatedConversation);
      
      return decryptedConversation;
    } catch (error) {
      console.error(`[ChatApiService] Failed to update conversation ${id}:`, error);
      throw error;
    }
  },

  async deleteConversation(
    api: ClientApi,
    id: UUID
  ): Promise<void> {
    console.log(`[ChatApiService] Deleting conversation ${id}`);
    try {
      await api.app.deleteConversation(id);
      console.log(`[ChatApiService] Conversation ${id} deleted.`);
    } catch (error) {
      console.error(`[ChatApiService] Failed to delete conversation ${id}:`, error);
      throw error;
    }
  },

  async fetchMessages(
    api: ClientApi,
    id: UUID,
    params?: GetConversationMessagesParams
  ): Promise<PaginatedMessagesResponse> {
    console.log(`[ChatApiService] Fetching messages for conversation ${id}:`, params);
    try {
      // Explicitly handle null cursor before calling API
      const apiParams: GetConversationMessagesParams = { ...params };
      if (apiParams.cursor === null) {
        delete apiParams.cursor; // Remove cursor property entirely if null
      }
      // Now apiParams.cursor is either string or undefined
      const response = await api.app.getConversationMessages(id, apiParams);
      console.log(`[ChatApiService] Received ${response.data.length} messages for ${id}.`);
      
      // Decrypt the message data
      const decryptedData = response.data.map(msg => decryptMessageData(msg));
      
      // Create a new response with decrypted data
      const decryptedResponse = {
        ...response,
        data: decryptedData
      };
      
      return decryptedResponse;
    } catch (error) {
      console.error(`[ChatApiService] Failed to fetch messages for ${id}:`, error);
      throw error;
    }
  },

  async createMessage(
    api: ClientApi,
    id: UUID,
    createRequest: MessageCreateRequest
  ): Promise<ApiMessage> {
    console.log(`[ChatApiService] Creating message for conversation ${id}:`, createRequest.message_id);
    try {
      // Encrypt the message content before sending to server
      const encryptedRequest = encryptMessageData(createRequest) as MessageCreateRequest;
      
      const savedMessage = await api.app.createMessage(id, encryptedRequest);
      console.log(`[ChatApiService] Message ${savedMessage.message_id} created successfully.`);
      
      // Decrypt the returned message
      const decryptedMessage = decryptMessageData(savedMessage);
      
      return decryptedMessage;
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
      onReasoningStart?: (messageId?: string) => void;
      onReasoningChunk?: (messageId: string | undefined, chunk: string) => void;
      onReasoningEnd?: (messageId?: string) => void;
      onContentChunk?: (messageId: string | undefined, chunk: string) => void;
      onFinish: (message: string, date: Date, responseRes?: any) => void;
      onError: (error: Error) => void;
      onController?: (controller: AbortController) => void;
    }
  ): Promise<void> {
    console.log("[ChatApiService] Calling LLM chat:", { messagesCount: args.messages.length, config: args.config });
    try {
      // Prepare the LLMConfig for api.llm.chat, including the targetEndpoint
      const llmChatConfig: LLMConfig = {
        model: args.config.name, // ModelConfig (app/constant) uses 'name' for model identifier
        temperature: args.config.temperature,
        top_p: args.config.top_p,
        stream: args.config.stream ?? true,
        presence_penalty: args.config.presence_penalty,
        frequency_penalty: args.config.frequency_penalty,
        reasoning: args.config.reasoning ?? false,
        targetEndpoint: args.config.endpoint, // Pass the endpoint from ModelConfig
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
  ): Promise<{ message: string, date: Date }> {
    console.log("[ChatApiService] Calling LLM summarize:", { messagesCount: messages.length, config });
    return new Promise((resolve, reject) => {
      const llmSummarizeConfig: LLMConfig = {
        model: config.name, // Use name from ModelConfig for model identifier
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        reasoning: config.reasoning ?? false,
        stream: false, // Ensure stream is false for summarize
        targetEndpoint: config.endpoint, // Pass the endpoint
      };
      api.llm.chat({
        messages: messages.concat(createMessage({ role: "system", content: prompt, date: new Date() }) as unknown as RequestMessage[]),
        config: llmSummarizeConfig,
        onFinish: (message, date, responseRes) => {
          if (responseRes?.status === 200) {
            console.log("[ChatApiService] LLM summarize finished successfully.");
            resolve({ message, date });
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
      const llmTitleConfig: LLMConfig = {
        model: config.name, // Use name from ModelConfig for model identifier
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        reasoning: config.reasoning ?? false,
        stream: false, // Ensure stream is false for title generation
        targetEndpoint: config.endpoint, // Pass the endpoint
      };
      api.llm.chat({
        messages: [createMessage({ role: "user", content: prompt }) as unknown as RequestMessage],
        config: llmTitleConfig,
        onFinish: (title, date, responseRes) => {
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