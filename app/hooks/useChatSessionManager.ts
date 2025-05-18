import { useState, useEffect, useCallback, useRef } from "react";
import { UUID } from "crypto";
import {
  ChatMessage,
  createMessage,
  MessageSyncState,
} from "@/app/types/chat"; // Adjust path as needed
import { useChatActions } from "./useChatActions";
import { useApiClient } from "../context/ApiProviderContext";
import { ChatApiService } from "../services/ChatApiService";
import { MultimodalContent } from "@/app/client/api"; // Import MultimodalContent
import { ModelConfig } from "../store/config";
import { ChatControllerPool } from "../client/controller";

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
    input: string,
    files?: {url: string, type: string, name: string}[],
    callbacks?: {
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
      onController?: (controller: AbortController) => void;
    }
  ) => Promise<void>;
  sendNewQuery: (
    messages: ChatMessage[],
    callbacks?: {
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
      onController?: (controller: AbortController) => void;
    }
  ) => Promise<void>;

  clearMessages: (fromMessageId: UUID) => void;
  markMessageAsError: (messageId: string, errorInfo?: any) => void;
  finalizeStreamedBotMessage: (botMessageId: UUID, finalContent: string, date: Date) => void;
}

const INITIAL_LOAD_LIMIT = 20;
const PAGINATION_LOAD_LIMIT = 20;

export function useChatSessionManager(
  sessionId: UUID,
  modelConfig: ModelConfig
): ChatSessionManagerResult {
  const { loadMessagesForSession: actionLoadMessages, saveMessageToServer, generateSessionTitle } =
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

  // Effect to generate session title after the first user message and bot response
  useEffect(() => {
    if (!sessionId || !generateSessionTitle) {
      return;
    }

    // Helper to get text content from a message
    const getTextFromMessage = (messageContent: string | MultimodalContent[]): string => {
      if (typeof messageContent === 'string') {
        return messageContent;
      }
      if (Array.isArray(messageContent)) {
        const textPart = messageContent.find(part => part.type === 'text');
        return textPart?.text || "";
      }
      return "";
    };

    const nonErrorMessages = displayedMessages.filter(
      (m) => !m.isError && (m.role === "user" || m.role === "system") && !m.streaming
    );

    if (
      nonErrorMessages.length === 2 &&
      nonErrorMessages[0].role === "user" &&
      nonErrorMessages[1].role === "system"
    ) {
      const userMessageText = getTextFromMessage(nonErrorMessages[0].content).trim();
      const assistantMessageText = getTextFromMessage(nonErrorMessages[1].content).trim();

      if (
        userMessageText.length > 0 &&
        assistantMessageText.length > 0
      ) {
        setTimeout(() => {
          generateSessionTitle(
            sessionId,
            userMessageText,
            assistantMessageText
          );
        }, 0);
      }
    }
  }, [
    displayedMessages,
    sessionId,
    generateSessionTitle
  ]);

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

  const sendNewUserMessage = useCallback(
    async (
      input: string,
      files?: {url: string, type: string, name: string}[],
      callbacks?: {
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

      let messageContent: string | MultimodalContent[];
      if (files && files.length > 0) {
        const contentParts: MultimodalContent[] = [{ type: "text", text: input }];
        for (const file of files) {
          if (file.type.startsWith("image/")) {
            // Assuming Panda API format based on user request
            contentParts.push({ 
              type: "image_url", 
              image_url: { url: file.url } // file.url is already the base64 data URI
            });
          } else {
            // For other file types, we might send a link or just text representation
            // For now, let's add a text representation as requested for the payload structure
            // This part might need further clarification on how non-image files are handled by Panda API
            // The user payload showed image_url, not a generic file_url. 
            // For now, we will only include image files in the structured content for Panda.
            // Non-image files will be ignored for the multimodal content part.
            console.warn(`File ${file.name} is not an image and will be ignored for Panda API multimodal content.`);
          }
        }
        // If only text was provided, or no images were processed, keep it as string
        if (contentParts.length > 1) { // More than just the initial text part
          messageContent = contentParts;
        } else {
          messageContent = input; 
        }
      } else {
        messageContent = input;
      }

      // Add user message to store
      const userMessage = createMessage({
        role: "user",
        content: messageContent, // Use the potentially multimodal content
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

  const finalizeStreamedBotMessage = useCallback(
    (botMessageId: UUID, finalContent: string, date: Date) => {
      setDisplayedMessages((prevMessages) => {
        let messageToSave: ChatMessage | undefined;
        const updatedMessages = prevMessages.map((msg) => {
          if (msg.id === botMessageId) {
            messageToSave = msg;
            // This is the message that should have been updated by onReasoningChunk, etc.
            // const completeReasoning = msg.reasoning || "";
            // let contentForSaving = finalContent;

            // if (completeReasoning) {
            //   contentForSaving = `[Reasoning]:\n${completeReasoning}\n\n[Answer]:\n${finalContent}`;
            // }

            // // This is the object that will be saved to the server
            // messageToSave = {
            //   ...msg,
            //   content: contentForSaving, // Combined content for saving
            //   reasoning: completeReasoning, // Keep separate reasoning for UI
            //   streaming: false,
            //   isReasoning: false, // Ensure this is reset
            //   date: date,
            //   syncState: MessageSyncState.PENDING_CREATE,
            // };
            
            // console.log("[ChatSessionManager] Finalizing bot message in setDisplayedMessages. ID:", messageToSave.id, "Content for DB:", messageToSave.content);

            // // Return the version for UI state (separate content and reasoning)
            // return {
            //   ...messageToSave, // Spread to get most fields
            //   content: finalContent,    // Override with main content for UI
            //   reasoning: completeReasoning, // Ensure reasoning is separate for UI
            // };
          }
          return msg;
        });

        if (messageToSave) {
          saveMessageToServer(sessionId, messageToSave);
        } else {
          // This case should ideally not happen if botMessage was correctly added
          // to displayedMessages by sendNewQuery and not removed before finalization.
          console.error(
            `[ChatSessionManager] finalizeStreamedBotMessage: Bot message with ID ${botMessageId} not found in prevMessages. This is unexpected. Saving a new message without prior streamed reasoning.`
          );
          // Fallback: create a new message and save it (similar to old behavior on find fail)
          const fallbackBotMessage = createMessage({
            id: botMessageId,
            role: "system",
            content: finalContent, // Reasoning accumulated during streaming will be lost here
            date: date,
            streaming: false,
            syncState: MessageSyncState.PENDING_CREATE,
          });
          saveMessageToServer(sessionId, fallbackBotMessage);
          // If this fallback is hit, updatedMessages doesn't include this new message unless we find a way to add it.
          // For now, the console error highlights a deeper issue if this path is taken.
        }
        return updatedMessages;
      });
    },
    [sessionId, saveMessageToServer] // displayedMessages is removed as we use functional update
  );

  const sendNewQuery = useCallback(
    async (
      messages: ChatMessage[],
      callbacks?: {
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
        onController?: (controller: AbortController) => void;
      }
    ) => {
      let reasoningStartTimeForThisQuery: number | null = null; // ADDED: Local variable for this query's reasoning start time
      const botMessage = createMessage({
        role: "system",
        content: "", 
        reasoning: "",
        isReasoning: false, 
        streaming: true,
        model: modelConfig.model,
        syncState: MessageSyncState.PENDING_CREATE,
      });
      const localBotMessageId = botMessage.id;

      setDisplayedMessages((prev) => [...prev, botMessage]);

      ChatApiService.callLlmChat(apiClient, {
        messages: messages,
        config: { ...modelConfig, stream: true, reasoning: modelConfig.reasoning },
        
        onReasoningStart: () => {
          reasoningStartTimeForThisQuery = Date.now(); // MODIFIED: Use local variable
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { ...msg, isReasoning: true, reasoning: msg.reasoning || "" } 
                : msg
            )
          );
          callbacks?.onReasoningStart?.(localBotMessageId);
        },
        onReasoningChunk: (_messageId: string | undefined, chunk: string) => {
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { ...msg, reasoning: (msg.reasoning || "") + chunk, streaming: true, isReasoning: true }
                : msg
            )
          );
          callbacks?.onReasoningChunk?.(localBotMessageId, chunk);
        },
        onReasoningEnd: () => { 
          let duration = 0;
          if (reasoningStartTimeForThisQuery !== null) { // MODIFIED: Use local variable
            duration = Date.now() - reasoningStartTimeForThisQuery;
            reasoningStartTimeForThisQuery = null; // MODIFIED: Reset local variable
          }
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId ? { ...msg, isReasoning: false, reasoningTime: duration } : msg
            )
          );
          callbacks?.onReasoningEnd?.(localBotMessageId);
        },
        onContentChunk: (_messageId: string | undefined, chunk: string) => {
          // let durationProps: { reasoningTime?: number } = {};
          // // If reasoning was active (indicated by reasoningStartTimeForThisQuery being set)
          // // and content is now arriving, this means reasoning is ending.
          // if (reasoningStartTimeForThisQuery !== null) { // MODIFIED: Use local variable
          //   const duration = Date.now() - reasoningStartTimeForThisQuery;
          //   durationProps.reasoningTime = duration;
          //   reasoningStartTimeForThisQuery = null; // MODIFIED: Reset local variable
          // }

          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { ...msg, content: (msg.content || "") + chunk, streaming: true, isReasoning: false } 
                : msg
            )
          );
          callbacks?.onContentChunk?.(localBotMessageId, chunk);
        },

        onFinish(finalMainContent: string, timestamp: Date, response: Response) {
          console.log("[ChatSessionManager] LLM stream onFinish. localBotMessageId:", localBotMessageId, "finalMainContent length:", finalMainContent.length);
          
          // setDisplayedMessages((prevMessages) =>
          //   prevMessages.map((msg) => {
          //     if (msg.id === localBotMessageId) {
          //       let updatedMsgFields: Partial<ChatMessage> = {
          //         // streaming will be set to false by finalizeStreamedBotMessage
          //         // content will be set by finalizeStreamedBotMessage
          //       };
          //       if (reasoningStartTimeForThisQuery !== null) { // MODIFIED: Use local variable
          //         const duration = Date.now() - reasoningStartTimeForThisQuery;
          //         updatedMsgFields.reasoningTime = duration;
          //         updatedMsgFields.isReasoning = false; 
          //         reasoningStartTimeForThisQuery = null; // MODIFIED: Reset local variable
          //       }
          //       return { ...msg, ...updatedMsgFields };
          //     }
          //     return msg;
          //   })
          // );

          finalizeStreamedBotMessage(localBotMessageId, finalMainContent, new Date(timestamp));
          callbacks?.onSuccess?.(localBotMessageId, finalMainContent, new Date(timestamp));
          ChatControllerPool.remove(sessionId, localBotMessageId);
        },
        onError(error: Error) {
          console.error("[ChatActions] LLM call failed:", error);
          let duration = 0;
          if (reasoningStartTimeForThisQuery !== null) { // MODIFIED: Use local variable
            duration = Date.now() - reasoningStartTimeForThisQuery;
            reasoningStartTimeForThisQuery = null; // MODIFIED: Reset local variable
          }
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { 
                    ...msg, 
                    isError: true, 
                    streaming: false, 
                    isReasoning: false,
                    reasoningTime: duration, // Also set duration on error
                    content: (typeof msg.content === 'string' ? msg.content : "") + "\n\n--- ERROR ---\n" + error.message,
                    syncState: MessageSyncState.ERROR 
                  }
                : msg
            )
          );
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
        }
      });
    },
    [apiClient, sessionId, modelConfig, finalizeStreamedBotMessage]
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

  const clearMessages = useCallback(
    (fromMessageId: UUID) => {
      console.log(
        "[useChatSessionManager] Clearing messages from:",
        fromMessageId,
        "messages:",
        displayedMessages.map((m) => m.id)
      );
      const clearIndex = displayedMessages.findIndex(
        (msg) => msg.id === fromMessageId
      );
      if (clearIndex === -1) {
        console.error(
          "[useChatSessionManager] clearMessages: Could not find message to clear after:",
          fromMessageId,
          "messages:",
          displayedMessages.map((m) => m.id)
        );
        return;
      }
      if (clearIndex > 0) {
        setDisplayedMessages((prev) => prev.slice(0, clearIndex));
      } else {
        setDisplayedMessages([]);
      }
    },
    [displayedMessages]
  );

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
    markMessageAsError,
    finalizeStreamedBotMessage,
  };
}
