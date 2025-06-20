"use client";

import { useEffect, useState } from "react";
import { UUID } from "crypto";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useChat } from "@/sdk/hooks";
import { ChatMessage } from "@/types/chat";
import { ModelConfig } from "@/types/constant";
import { FileInfo } from "@/client/types";
import { MultimodalContent } from "@/client/api";

/**
 * Hook that provides chat session functionality using the SDK.
 * This replaces the legacy useChatSessionManager hook.
 */
export function useChatSession(sessionId: UUID, modelConfig: ModelConfig) {
  const sdk = usePandaSDK();
  const [chat, setChat] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  // Get the chat instance
  useEffect(() => {
    if (!sessionId) return;

    const loadChat = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);
        
        // Try to get existing chat or create/load it
        let chatInstance = await sdk.chat.getChat(sessionId);
        
        if (!chatInstance) {
          // If chat not found, it might be a new session
          // In this case, we should have the chat already created by the ChatManager
          console.warn(`Chat ${sessionId} not found in manager`);
          return;
        }

        // Load initial messages and summaries if not already loaded
        if (chatInstance.messages.length === 0) {
          await chatInstance.loadInitial();
        }

        // Update model config if provided
        if (modelConfig) {
          chatInstance.updateModelConfig(modelConfig);
        }

        setChat(chatInstance);
      } catch (error) {
        console.error('Failed to load chat session:', error);
        setInitError(error as Error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadChat();
  }, [sessionId, sdk.chat, modelConfig]);

  // Use the chat hook to get reactive state
  const chatState = useChat(chat);

  const sendMessage = async (
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
      onController?: (controller: AbortController) => void;
    } = {}
  ) => {
    if (!chat || !modelConfig) {
      throw new Error('Chat not initialized or model config missing');
    }

    return chat.sendMessage(userInput, modelConfig, options);
  };

  const loadMoreMessages = async () => {
    if (!chat) return;
    return chat.loadMoreMessages();
  };

  const addOptimisticMessage = (message: ChatMessage) => {
    if (!chat) return;
    chat.addOptimisticMessage(message);
  };

  const updateOptimisticMessage = (localMessageId: string, updates: Partial<ChatMessage>) => {
    if (!chat) return;
    chat.updateOptimisticMessage(localMessageId, updates);
  };

  const clearMessages = async (fromMessageId: UUID) => {
    if (!chat) return;
    return chat.clearMessages(fromMessageId);
  };

  const markMessageAsError = (messageId: string, errorInfo?: any) => {
    if (!chat) return;
    chat.markMessageAsError(messageId as UUID, errorInfo?.message || 'Unknown error');
  };

  const finalizeStreamedBotMessage = (
    botMessageId: UUID,
    finalContent: string,
    date: Date,
  ) => {
    if (!chat) return;
    chat.finalizeMessage(botMessageId, finalContent, date);
  };

  return {
    // State
    displayedMessages: chatState?.messages || [],
    isLoading: isInitializing || chatState?.isLoading || false,
    hasMoreMessages: chatState?.hasMoreMessages || false,
    messageFetchError: initError,
    
    // Actions
    sendNewUserMessage: sendMessage,
    sendNewQuery: sendMessage, // Alias for compatibility
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
    clearMessages,
    markMessageAsError,
    finalizeStreamedBotMessage,

    // Additional state
    isInitializing,
    initError,
    chat,
  };
}