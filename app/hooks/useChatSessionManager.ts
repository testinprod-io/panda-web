import { useState, useEffect, useCallback, useRef } from "react";
import { UUID } from "crypto";
import {
  ChatMessage,
  createMessage,
  MessageSyncState,
  RequestMessage,
} from "@/app/types/chat"; // Adjust path as needed
import { useChatActions } from "./useChatActions";
import { useApiClient } from "../context/ApiProviderContext";
import { ChatApiService } from "../services/ChatApiService";
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Optional, for error notifications
import Locale from "@/app/locales"; // Optional
import { ModelConfig, ModelType } from "../store/config";
import { mode } from "crypto-js";
import { getMessageTextContent } from "../utils";
import { ChatControllerPool } from "../client/controller";
import { prettyObject } from "../utils/format";
interface ChatSessionManagerResult {
  displayedMessages: ChatMessage[];
  isLoading: boolean; // Unified loading state (initial OR more)
  hasMoreMessages: boolean;
  messageFetchError: Error | null;
  loadMoreMessages: () => Promise<void>;
  addOptimisticMessage: (message: ChatMessage) => void;
  updateOptimisticMessage: (
    localMessageId: string,
    updates: Partial<ChatMessage>
  ) => void;
  sendNewUserMessage: (
    content: string,
    attachImages?: string[],
    callbacks?: {
      onStart?: (messageId: UUID) => void;
      onStreaming?: (messageId: UUID, partialMessage: string) => void;
      onSuccess?: (
        messageId: UUID,
        finalMessage: string,
        timestamp: Date
      ) => void;
      onFailure?: (error: Error) => void;
      onController?: (controller: AbortController) => void;
    }
  ) => Promise<void>;
  sendNewQuery: (
    messages: ChatMessage[],
    callbacks?: {
      onStart?: (messageId: UUID) => void;
      onStreaming?: (messageId: UUID, partialMessage: string) => void;
      onSuccess?: (messageId: UUID, finalMessage: string, timestamp: Date) => void;
      onFailure?: (error: Error) => void;
      onController?: (controller: AbortController) => void;
    }
  ) => Promise<void>;

  clearMessages: (afterMessageId: UUID) => void;
  finalizeStreamedBotMessage: (
    botMessageId: UUID,
    finalContent: string,
    date: Date
  ) => void;
  markMessageAsError: (messageId: UUID, errorInfo?: any) => void;
}

const INITIAL_LOAD_LIMIT = 20;
const PAGINATION_LOAD_LIMIT = 20;

export function useChatSessionManager(
  sessionId: UUID,
  modelConfig: ModelConfig
): ChatSessionManagerResult {
  const { loadMessagesForSession: actionLoadMessages, saveMessageToServer } =
    useChatActions();
  // const { showSnackbar } = useSnackbar(); // Uncomment if you want to use snackbar for errors here

  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreServerMessages, setHasMoreServerMessages] = useState(true);
  const [nextServerMessageCursor, setNextServerMessageCursor] = useState<
    string | undefined
  >(undefined);
  const [messageFetchError, setMessageFetchError] = useState<Error | null>(
    null
  );

  const loadInProgress = useRef(false); // Prevents concurrent fetch operations
  const apiClient = useApiClient();

  // Effect for initial message load when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      console.log("[useChatSessionManager] No sessionId, clearing state.");
      setDisplayedMessages([]);
      setIsLoading(false);
      setHasMoreServerMessages(true);
      setNextServerMessageCursor(undefined);
      setMessageFetchError(null);
      loadInProgress.current = false; // Ensure loadInProgress is false when there's no session
      return;
    }

    // If a load is already in progress for this specific hook instance, skip.
    if (loadInProgress.current) {
      console.log(
        `[useChatSessionManager] Load already in progress for session ${sessionId}. Skipping redundant effect run.`
      );
      return;
    }

    console.log(
      `[useChatSessionManager] Session ID is: ${sessionId}. Initializing message load.`
    );
    // Reset state for the new session to ensure no stale data from a previous session ID
    setDisplayedMessages([]);
    setHasMoreServerMessages(true);
    setNextServerMessageCursor(undefined);
    setMessageFetchError(null);

    setIsLoading(true);
    loadInProgress.current = true;

    actionLoadMessages(sessionId, { limit: INITIAL_LOAD_LIMIT })
      .then(({ messages, pagination }) => {
        console.log(
          `[useChatSessionManager] Initial messages fetched for ${sessionId}. Count: ${messages.length}. Pagination:`,
          pagination
        );
        const serverMessages = messages.slice().reverse();
        setDisplayedMessages((prevMessages) => {
          const optimisticMessagesToShow = prevMessages.filter(
            (pm) =>
              pm.syncState === MessageSyncState.PENDING_CREATE &&
              !serverMessages.some((sm) => sm.id === pm.id)
          );
          const updatedMessages = [
            ...serverMessages,
            ...optimisticMessagesToShow,
          ];
          console.log(
            `[useChatSessionManager] Initial load: Merged server (${serverMessages.length}) with optimistic (${optimisticMessagesToShow.length}). Total: ${updatedMessages.length}`
          );
          return updatedMessages;
        });
        setHasMoreServerMessages(pagination.has_more);
        setNextServerMessageCursor(pagination.next_cursor ?? undefined);
        console.log(
          `[useChatSessionManager] Initial load success. Has more: ${pagination.has_more}, Next cursor: ${pagination.next_cursor}`
        );
      })
      .catch((err) => {
        console.error(
          `[useChatSessionManager] Error loading initial messages for ${sessionId}:`,
          err
        );
        setMessageFetchError(err);
      })
      .finally(() => {
        console.log(
          `[useChatSessionManager] Initial load process finished for session: ${sessionId}`
        );
        setIsLoading(false);
        loadInProgress.current = false;
      });
    // No cleanup function needed here unless actionLoadMessages supports AbortController
  }, [sessionId]); // actionLoadMessages should be stable

  const loadMoreMessages = useCallback(async () => {
    if (!sessionId) {
      console.log(
        "[useChatSessionManager] loadMoreMessages: No session ID, skipping."
      );
      return;
    }
    if (isLoading || !hasMoreServerMessages || loadInProgress.current) {
      console.log(
        `[useChatSessionManager] loadMoreMessages: Skipping due to loading/no more/in progress. Initial: ${isLoading}, HasMore: ${hasMoreServerMessages}, InProgress: ${loadInProgress.current}`
      );
      return;
    }

    console.log(
      `[useChatSessionManager] Loading more messages for ${sessionId}, cursor: ${nextServerMessageCursor}`
    );
    setIsLoading(true);
    setMessageFetchError(null); // Clear previous pagination error
    loadInProgress.current = true;

    try {
      const { messages: newMessages, pagination } = await actionLoadMessages(
        sessionId,
        { cursor: nextServerMessageCursor, limit: PAGINATION_LOAD_LIMIT }
      );
      console.log(
        `[useChatSessionManager] Fetched ${newMessages.length} more messages. Pagination:`,
        pagination
      );
      // New messages are older (fetched from a cursor going back in time).
      // Reverse them to maintain chronological order when prepending.

      const serverMessages = newMessages.slice().reverse();
      setDisplayedMessages((prevMessages) => {
        const optimisticMessagesToShow = prevMessages.filter(
          (pm) =>
            pm.syncState === MessageSyncState.PENDING_CREATE &&
            !serverMessages.some((sm) => sm.id === pm.id) // Avoid dupes if server returns it
        );
        // Combine server messages with still-pending optimistic messages
        const updatedMessages = [
          ...serverMessages,
          ...optimisticMessagesToShow,
        ];

        // const updatedMessages = [...reversedNewMessages, ...prevMessages];
        // console.log(`[useChatSessionManager] Prepended ${reversedNewMessages.length} messages. Total now: ${updatedMessages.length}.`);
        return updatedMessages;
      });

      setHasMoreServerMessages(pagination.has_more);
      setNextServerMessageCursor(pagination.next_cursor ?? undefined);
    } catch (err: any) {
      console.error(
        `[useChatSessionManager] Error loading more messages for ${sessionId}:`,
        err
      );
      setMessageFetchError(err);
    } finally {
      console.log(
        `[useChatSessionManager] Load more process finished for session: ${sessionId}`
      );
      setIsLoading(false);
      loadInProgress.current = false;
    }
  }, [sessionId, isLoading, hasMoreServerMessages, nextServerMessageCursor]);

  const addOptimisticMessage = useCallback(
    (message: ChatMessage) => {
      console.log(
        "[useChatSessionManager] Adding optimistic message (user input):",
        message
      );
      setDisplayedMessages((prev) => [...prev, message]);
      saveMessageToServer(sessionId, message);
    },
    [sessionId]
  );

  const updateOptimisticMessage = useCallback(
    (localMessageId: string, updates: Partial<ChatMessage>) => {
      console.log(
        `[useChatSessionManager] Updating optimistic message ID ${localMessageId} with:`,
        updates
      );
      setDisplayedMessages((prev) =>
        prev.map((msg) =>
          msg.id === localMessageId ? { ...msg, ...updates } : msg
        )
      );
    },
    []
  );

  const addStreamedBotMessageChunk = useCallback(
    (
      botMessageId: UUID,
      chunk: string,
      isInitialChunk: boolean,
      modelUsed?: string
    ) => {
      setDisplayedMessages((prev) => {
        const existingMsgIndex = prev.findIndex((m) => m.id === botMessageId);
        if (isInitialChunk && existingMsgIndex === -1) {
          // Create new placeholder for the bot message
          const placeholder: ChatMessage = {
            id: botMessageId,
            role: "assistant",
            content: chunk,
            date: new Date(),
            streaming: true,
            syncState: MessageSyncState.PENDING_CREATE, // Use PENDING_CREATE while streaming
            model: modelUsed as any, // Cast if model type mismatch
            isError: false,
          };
          console.log(
            "[useChatSessionManager] Creating new streaming bot message placeholder:",
            placeholder
          );
          return [...prev, placeholder];
        }
        // Append to existing streaming message
        return prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: chunk,
                streaming: true,
                isError: false,
                syncState: MessageSyncState.PENDING_CREATE,
              }
            : msg
        );
      });
    },
    []
  );

  const sendNewUserMessage = useCallback(
    async (
      content: string,
      attachImages?: string[],
      callbacks?: {
        onStart?: (messageId: UUID) => void;
        onStreaming?: (messageId: UUID, partialMessage: string) => void;
        onSuccess?: (
          messageId: UUID,
          finalMessage: string,
          timestamp: Date
        ) => void;
        onFailure?: (error: Error) => void;
        onController?: (controller: AbortController) => void;
      }
    ) => {
      if (!apiClient) {
        const error = new Error("[ChatActions] API Client not available.");
        console.error(error.message);
        callbacks?.onFailure?.(error);
        // TODO: Maybe show an error to the user?
        return;
      }

      // if (attachImages && attachImages.length > 0) {
      // This part needs to be adjusted if userContent is to become MultimodalContent[]
      // For now, assuming userContent remains string as per original structure before this refactor.
      // If attachImages is used, userContent definition and handling (incl. addUserMessage) must change.
      // }

      // Add user message to store
      const userMessage = createMessage({
        role: "user",
        content: content,
        syncState: MessageSyncState.PENDING_CREATE,
      });
      if (!userMessage) {
        const error = new Error(
          "[ChatActions] Failed to add user message to store."
        );
        console.error(error.message);
        callbacks?.onFailure?.(error);
        return;
      }

      const messagesForApi: ChatMessage[] = [
        ...displayedMessages,
        userMessage, // The new user message (content is string here)
      ];

      // Trigger saving user message (which was added earlier)
      // This is fire-and-forget in the original structure.
      // If its failure needs to be caught by lifecycleCallbacks.onFailure, it needs to be awaited.
      addOptimisticMessage(userMessage);
      // saveMessageToServer(currentSession.id, userMessage);

      sendNewQuery(messagesForApi, callbacks);
    },
    [apiClient, sessionId, modelConfig, displayedMessages]
  );

  const sendNewQuery = useCallback(
    async (
      messages: ChatMessage[],
      callbacks?: {
        onStart?: (messageId: UUID) => void;
        onStreaming?: (messageId: UUID, partialMessage: string) => void;
        onSuccess?: (
          messageId: UUID,
          finalMessage: string,
          timestamp: Date
        ) => void;
        onFailure?: (error: Error) => void;
        onController?: (controller: AbortController) => void;
      }
    ) => {
      // Add bot placeholder message to store
      const botMessage = createMessage({
        role: "assistant",
        content: "", // Start empty (decrypted)
        streaming: true,
        model: modelConfig.model, // Store the model used
        syncState: MessageSyncState.PENDING_CREATE, // Also needs saving eventually
      });
      if (!botMessage) {
        const error = new Error(
          "[ChatActions] Failed to add bot placeholder message to store."
        );
        console.error(error.message);
        // Potentially rollback userMessage addition or mark it as error
        callbacks?.onFailure?.(error);
        return;
      }
      const localBotMessageId = botMessage.id;

      addStreamedBotMessageChunk(botMessage.id, "", true, modelConfig.model);
      // --- Call LLM Service ---
      ChatApiService.callLlmChat(apiClient, {
        messages: messages,
        config: { ...modelConfig, stream: true },
        onUpdate(partialMessage: string) {
          addStreamedBotMessageChunk(
            botMessage.id,
            partialMessage,
            false,
            modelConfig.model
          );
          callbacks?.onStreaming?.(botMessage.id, partialMessage);
        },
        onFinish(finalMessage: string, timestamp: Date, response: Response) {
          console.log("[ChatActions] LLM stream finished.");
          botMessage.content = finalMessage;
          botMessage.syncState = MessageSyncState.PENDING_CREATE;
          botMessage.date = new Date(timestamp);
          botMessage.isError = false;
          // let finalBotMsg: ChatMessage | undefined;
          // store.updateMessage(botmcurrentSession.id, localBotMessageId, (msg) => {
          //     msg.content = finalMessage;
          //     msg.streaming = false;
          //     msg.syncState = MessageSyncState.PENDING_CREATE;
          //     msg.date = new Date(timestamp);
          //     msg.isError = false;
          //     finalBotMsg = { ...msg };
          // });
          finalizeStreamedBotMessage(botMessage.id, finalMessage, timestamp);
          // if (finalBotMsg) {
          //     saveMessageToServer(currentSession.id, finalBotMsg);
          //     store.updateStat(finalBotMsg);
          // }

          // const updatedSessionState = useChatStore.getState().sessions.find(s => s.id === currentSession.id);
          // if (
          //     updatedSessionState &&
          //     updatedSessionState.messages.filter(m => !m.isError).length === 2 &&
          //     updatedSessionState.topic === DEFAULT_TOPIC
          // ) {
          //     const userMsgContent = getMessageTextContent(userMessage); // userMessage.content is string
          //     const assistantMsgContent = finalMessage;
          //     if (userMsgContent.trim().length > 0 && assistantMsgContent.trim().length > 0) {
          //         console.log("[ChatActions] Triggering title generation.");
          //         setTimeout(() => generateSessionTitle(currentSession.id, userMsgContent, assistantMsgContent), 0);
          //     }
          // }

          ChatControllerPool.remove(sessionId, localBotMessageId);
          callbacks?.onSuccess?.(botMessage.id, finalMessage, timestamp);
        },
        onError(error: Error) {
          console.error("[ChatActions] LLM call failed:", error);
          const isAborted = error.message?.includes?.("aborted");
          const errorContent =
            "\n\n" + prettyObject({ error: true, message: error.message });

          // Update user message state to error
          botMessage.isError = true;
          botMessage.syncState = MessageSyncState.ERROR;
          botMessage.date = new Date();

          // store.updateMessage(currentSession.id, localUserMessageId, (msg) => {
          //     msg.isError = !isAborted;
          //     msg.syncState = MessageSyncState.ERROR;
          // });

          // Update bot message placeholder state to error
          // store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
          //     msg.content = (msg.content || "") + errorContent;
          //     msg.streaming = false;
          //     msg.isError = !isAborted;
          //     msg.syncState = MessageSyncState.ERROR;
          //     msg.date = new Date();
          // });

          ChatControllerPool.remove(sessionId, localBotMessageId);
          callbacks?.onFailure?.(error);
        },
        onController(controller: AbortController) {
          ChatControllerPool.addController(
            sessionId,
            localBotMessageId,
            controller
          );
          callbacks?.onController?.(controller);
        },
      });
    },
    [apiClient, sessionId, modelConfig, displayedMessages]
  );

  const finalizeStreamedBotMessage = useCallback(
    (botMessageId: UUID, finalContent: string, date: Date) => {
      console.log(
        `[useChatSessionManager] Finalizing streamed bot message ID ${botMessageId}. Final content length: ${finalContent.length}`
      );
      const finalBotMessage =
        displayedMessages.find((m) => m.id === botMessageId) ??
        createMessage({
          id: botMessageId,
          role: "assistant",
          content: finalContent,
          date: date,
          streaming: false,
          syncState: MessageSyncState.PENDING_CREATE,
        });
      saveMessageToServer(sessionId, finalBotMessage);
      setDisplayedMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                content: finalContent,
                streaming: false,
                date: date,
                syncState: MessageSyncState.PENDING_CREATE,
              } // Ready to be saved by actions
            : msg
        )
      );
    },
    []
  );

  const markMessageAsError = useCallback(
    (messageId: string, errorInfo?: any) => {
      console.log(
        `[useChatSessionManager] Marking message ID ${messageId} as error. Error:`,
        errorInfo
      );
      setDisplayedMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isError: true,
                streaming: false,
                content:
                  (msg.content || "") +
                  `\n\n--- ERROR ---\n${errorInfo?.message || "Unknown error"}`,
                syncState: MessageSyncState.ERROR,
              }
            : msg
        )
      );
    },
    []
  );

  const clearMessages = useCallback((fromMessageId: UUID) => {
    console.log("[useChatSessionManager] Clearing messages from:", fromMessageId, "messages:", displayedMessages.map(m => m.id));
    const clearIndex = displayedMessages.findIndex(
      (msg) => msg.id === fromMessageId
    );
    if (clearIndex === -1) {
      console.error(
        "[useChatSessionManager] clearMessages: Could not find message to clear after:",
        fromMessageId,
        "messages:", displayedMessages.map(m => m.id)
      );
      return;
    }
    if (clearIndex > 0) {
      setDisplayedMessages((prev) => prev.slice(0, clearIndex));
    } else {
      setDisplayedMessages([]);
    }
  }, [displayedMessages]);

  return {
    displayedMessages,
    isLoading,
    hasMoreMessages: hasMoreServerMessages,
    messageFetchError,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
    sendNewUserMessage,
    sendNewQuery,
    clearMessages,
    // addStreamedBotMessageChunk,
    finalizeStreamedBotMessage,
    markMessageAsError,
  };
}
