import { useState, useEffect, useCallback, useRef } from "react";
import { UUID } from "crypto";
import {
  ChatMessage,
  createMessage,
  MessageSyncState,
} from "@/types/chat"; // Adjust path as needed
import { useChatActions } from "./useChatActions";
import { useApiClient } from "@/context/ApiProviderContext";
import { ChatApiService } from "@/services/ChatApiService";
import { MultimodalContent, RequestMessage } from "@/client/api"; // Import MultimodalContent and RequestMessage
import { ModelConfig } from '@/types/constant';
import { ChatControllerPool } from "@/client/controller";
import { useChatStore } from '@/store/chat'; // Corrected import
import { ChatSession } from '@/types/session'; // Added import for ChatSession
import { Summary } from "@/client/types"; // Import Summary type
import { useEncryption } from "@/context/EncryptionProvider";
import { EncryptionService } from "@/services/EncryptionService";

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
    files?: {url: string, fileId: string, type: string, name: string}[],
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

  clearMessages: (fromMessageId: UUID) => Promise<void>;
  markMessageAsError: (messageId: string, errorInfo?: any) => void;
  finalizeStreamedBotMessage: (botMessageId: UUID, finalContent: string, date: Date) => void;
}

const INITIAL_LOAD_LIMIT = 20;
const PAGINATION_LOAD_LIMIT = 20;

export function useChatSessionManager(
  sessionId: UUID,
  modelConfig: ModelConfig
): ChatSessionManagerResult {
  const { 
    loadMessagesForSession: actionLoadMessages, 
    saveMessageToServer, 
    generateSessionTitle, 
    loadSummariesForSession: actionLoadSummaries,
    summarizeAndStoreMessages: actionSummarize
  } = useChatActions();
  const apiClient = useApiClient();

  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreServerMessages, setHasMoreServerMessages] = useState(true);
  const [nextServerMessageCursor, setNextServerMessageCursor] = useState<
    string | undefined
  >(undefined);
  const [messageFetchError, setMessageFetchError] = useState<Error | null>(
    null
  );

  // Local state for summaries
  const [localSummaries, setLocalSummaries] = useState<Summary[]>([]);
  const [localLastSummarizedMessageId, setLocalLastSummarizedMessageId] = useState<UUID | null>(null);
  const [localIsSummarizing, setLocalIsSummarizing] = useState<boolean>(false);

  const loadInProgress = useRef(false); // Prevents concurrent fetch operations

  const { isLocked } = useEncryption();

  useEffect(() => {
    if (!isLocked) {
      console.log(`[useChatSessionManager] App is UNLOCKED. Processing messages for decryption.`);
      setDisplayedMessages(prevMessages => 
        prevMessages.map(msg => {
          // Avoid re-decrypting if content is not a string (already an object like MultimodalContent or already processed)
          // or if it doesn't look like it needs decryption (e.g., simple heuristic or flag).
          // For this example, we'll proceed if it's a string.
          const originalContent = msg.content;
          const originalReasoning = msg.reasoning;
          let contentChanged = false;

          let newContent = originalContent;
          if (typeof originalContent === 'string') {
            const decrypted = EncryptionService.decryptChatMessageContent(originalContent);
            if (decrypted !== originalContent) {
              newContent = decrypted;
              contentChanged = true;
            }
          }
          // TODO: Handle MultimodalContent parts if they can be encrypted individually

          let newReasoning = originalReasoning;
          if (typeof originalReasoning === 'string') {
            const decryptedR = EncryptionService.decryptChatMessageContent(originalReasoning);
            if (decryptedR !== originalReasoning) {
              newReasoning = decryptedR;
              contentChanged = true;
            }
          }

          if (contentChanged) {
            console.log(`[useChatSessionManager] Decrypted message ID: ${msg.id}`);
            return { ...msg, content: newContent, reasoning: newReasoning };
          }
          return msg;
        })
      );
      setLocalSummaries(prevSummaries => 
        prevSummaries.map(summary => {
          const decrypted = EncryptionService.decrypt(summary.content);
          if (decrypted !== summary.content) {
            return { ...summary, content: decrypted };
          }
          return summary;
        })
      );
    } else {
      console.log(`[useChatSessionManager] App is LOCKED. Ensuring messages are in their original/encrypted state.`);
      // If you need to revert to an encrypted state or placeholder when locked:
      // This assumes that the initial load (when locked) provides encrypted data.
      // If displayedMessages could hold decrypted data from a previous unlock,
      // you might need to fetch the original encrypted versions or apply a placeholder.
      // For now, we'll assume messages are fetched encrypted or this useEffect handles the toggle.
      setDisplayedMessages(prevMessages => 
        prevMessages.map(msg => {
          // This is a simplified placeholder logic. Ideally, you'd revert to actual encrypted strings
          // or have a clear way to distinguish between pre-decryption and post-decryption states.
          // For this example, if it was decrypted, it might be complex to re-encrypt without original. 
          // So, this else block might be more about ensuring new messages loaded while locked are treated as raw.
          // If msg.content was previously decrypted and isLocked is now true, 
          // we should show a placeholder or the original encrypted form if available.
          // This part requires careful state management of original encrypted values if true reversion is needed.
          // For simplicity, this example doesn't revert already decrypted messages back to encrypted on lock.
          // It primarily focuses on decrypting when unlocked.
          return msg; // No change on lock in this simplified version; assumes messages are fetched encrypted.
        })
      );
    }
  }, [isLocked]); // Removed displayedMessages from deps to avoid loop with setDisplayedMessages, isLocked is the trigger.

  // Effect for initial message and summary load
  useEffect(() => {
    if (!sessionId) {
      setDisplayedMessages([]);
      setIsLoading(false);
      setHasMoreServerMessages(true);
      setNextServerMessageCursor(undefined);
      setMessageFetchError(null);
      // Reset local summary state as well
      setLocalSummaries([]);
      setLocalLastSummarizedMessageId(null);
      setLocalIsSummarizing(false);
      loadInProgress.current = false;
      return;
    }

    if (loadInProgress.current) return;

    console.log(
      `[useChatSessionManager] Session ID is: ${sessionId}. Initializing message and summary load.`
    );
    setDisplayedMessages([]); // Reset for new session
    setLocalSummaries([]);      // Reset for new session
    setLocalLastSummarizedMessageId(null);
    setLocalIsSummarizing(false);
    setHasMoreServerMessages(true);
    setNextServerMessageCursor(undefined);
    setMessageFetchError(null);
    
    setIsLoading(true);
    loadInProgress.current = true;

    Promise.all([
      actionLoadMessages(sessionId, { limit: INITIAL_LOAD_LIMIT }),
      actionLoadSummaries(sessionId) 
    ]).then(([messagesResult, summariesResult]) => {
        const { messages: fetchedChatMessages, pagination: messagesPagination } = messagesResult;
        const { summaries: fetchedSummaries, lastSummarizedMessageId: newLastSummarizedId } = summariesResult;

        console.log(
          `[useChatSessionManager] Initial messages fetched. Count: ${fetchedChatMessages.length}. Pagination:`, messagesPagination
        );
        console.log(
          `[useChatSessionManager] Initial summaries fetched. Count: ${fetchedSummaries.length}. LastSummarizedID: ${newLastSummarizedId}`
        );

        const serverMessagesChronological = fetchedChatMessages.slice().reverse();
        setDisplayedMessages(prevMessages => {
          // Filter out optimistic messages from the current state (prevMessages)
          // that are not present in the newly fetched server messages.
          console.log(`[useChatSessionManager] Filtering out optimistic messages from the current state (prevMessages) that are not present in the newly fetched server messages.`);
          console.log(`[useChatSessionManager] PrevMessages:`, prevMessages);
          console.log(`[useChatSessionManager] ServerMessagesChronological:`, serverMessagesChronological);
          const optimisticMessagesToKeep = prevMessages.filter(
            msg => !serverMessagesChronological.some(sm => sm.id === msg.id)
          );
          // The new state will be the server messages followed by any such optimistic messages.
          return [...serverMessagesChronological, ...optimisticMessagesToKeep];
        });
        
        setHasMoreServerMessages(messagesPagination.has_more);
        setNextServerMessageCursor(messagesPagination.next_cursor ?? undefined);

        setLocalSummaries(fetchedSummaries);
        setLocalLastSummarizedMessageId(newLastSummarizedId);

      })
      .catch((err) => {
        console.error(
          `[useChatSessionManager] Error loading initial messages or summaries for ${sessionId}:`,
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
  }, [sessionId]);

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

  // Effect for triggering summarization
  useEffect(() => {
    if (!sessionId || !actionSummarize || localIsSummarizing) {
      return;
    }
    // No longer directly accessing store.sessions for currentSessionFromStore.messages here.
    // We operate on displayedMessages.

    const SUMMARIZE_INTERVAL = 10;
    let messagesToConsiderForSummarization: ChatMessage[];

    // displayedMessages is chronological (oldest first)
    if (localLastSummarizedMessageId) {
      const lastSummarizedMsgIndex = displayedMessages.findIndex(
        (msg: ChatMessage) => msg.id === localLastSummarizedMessageId
      );
      if (lastSummarizedMsgIndex !== -1) {
        messagesToConsiderForSummarization = displayedMessages.slice(lastSummarizedMsgIndex + 1);
      } else {
        // If last summarized ID isn't in displayedMessages, it implies it's older than the current view.
        // For summarization, we should only consider messages *within the current view* that are newer.
        // So, if the ID is not found, all displayedMessages are candidates (as if no summary was relevant to current view).
        // This interpretation might need refinement based on desired behavior for very long scrollbacks.
        // A simpler take: if not found, assume all displayedMessages are newer than any known summary relevant to *this view*.
        console.warn(`[ChatSessionManager] Summarization Trigger: localLastSummarizedMessageId ${localLastSummarizedMessageId} not found in displayedMessages. Considering all displayed messages.`);
        messagesToConsiderForSummarization = displayedMessages;
      }
    } else {
      messagesToConsiderForSummarization = displayedMessages; // No summaries yet for this session instance
    }
    
    const finalMessagesToConsider = messagesToConsiderForSummarization.filter((msg: ChatMessage) => msg.syncState === MessageSyncState.SYNCED && !msg.isError);

    if (finalMessagesToConsider.length >= SUMMARIZE_INTERVAL) {
      const batchToSummarize = finalMessagesToConsider.slice(0, SUMMARIZE_INTERVAL);
      
      console.log(`[ChatSessionManager] Triggering summarization (from displayedMessages) with ${batchToSummarize.length} messages.`);
      setLocalIsSummarizing(true);
      actionSummarize(sessionId, batchToSummarize)
        .then(newSummary => {
          if (newSummary) {
            setLocalSummaries(prevSummaries => 
              [...prevSummaries, newSummary].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            );
            setLocalLastSummarizedMessageId(newSummary.end_message_id);
          }
        })
        .catch(error => {
          console.error("[ChatSessionManager] Error during summarization action call:", error);
        })
        .finally(() => {
          setLocalIsSummarizing(false);
        });
    }
  // Depends on displayedMessages now, instead of store.sessions
  }, [sessionId, displayedMessages, actionSummarize, localIsSummarizing, localLastSummarizedMessageId]);

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
      files?: {url: string, fileId: string, type: string, name: string}[],
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

      let messageContent = input;
      let attachments: MultimodalContent[] = [];
      let fileIds: string[] = [];
      
      if (files && files.length > 0) {
        for (const file of files) {
          console.log(`[useChatSessionManager] Adding file to message:`, file);
          console.log(`[useChatSessionManager] File type:`, file.type);
          if (file.type.startsWith("image/")) {
            // Assuming Panda API format based on user request
            attachments.push({ 
              type: "image_url", 
              image_url: { url: file.url } // file.url is already the base64 data URI
            });
            fileIds.push(file.fileId);
          } else if (file.type.startsWith("application/pdf")) {
            // Assuming Panda API format based on user request
            attachments.push({ 
              type: "pdf_url", 
              pdf_url: { url: file.url } // file.url is already the base64 data URI
            });
            fileIds.push(file.fileId);
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
      }

      // Add user message to store
      const userMessage = createMessage({
        role: "user",
        content: messageContent, // Use the potentially multimodal content
        attachments: attachments,
        syncState: MessageSyncState.PENDING_CREATE,
        fileIds: fileIds,
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
            msg.streaming = false;
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
    [sessionId, displayedMessages] // displayedMessages is removed as we use functional update
  );

  const sendNewQuery = useCallback(
    async (
      rawMessages: ChatMessage[], // This is effectively [current_displayed_messages_snapshot..., new_user_message]
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
      // No longer using currentSessionFromStore for messages here.
      // localSummaries and localLastSummarizedMessageId are from local state.

      let messagesForApi: RequestMessage[] = [];

      const chronoSortedSummaries = [...localSummaries].reverse(); 
      chronoSortedSummaries.forEach(summary => {
        messagesForApi.push({
          role: "system",
          content: `Summary of previous conversation context (from ${summary.start_message_id} to ${summary.end_message_id}):\n${summary.content}`
        });
      });
      console.log("[ChatSessionManager] Summaries added to messagesForApi:", messagesForApi);

      let recentMessagesToInclude: ChatMessage[];
      // currentDisplayedMessagesSnapshot are the messages that were in displayedMessages when sendNewUserMessage was called.
      const currentDisplayedMessagesSnapshot = rawMessages.slice(0, -1);
      const newUserMessage = rawMessages[rawMessages.length - 1];

      if (localLastSummarizedMessageId) {
        const lastSummarizedMsgIndexInSnapshot = currentDisplayedMessagesSnapshot.findIndex(
          msg => msg.id === localLastSummarizedMessageId
        );
        if (lastSummarizedMsgIndexInSnapshot !== -1) {
          recentMessagesToInclude = currentDisplayedMessagesSnapshot.slice(lastSummarizedMsgIndexInSnapshot + 1);
        } else {
          // Last summary is older than anything in the current snapshot of displayed messages.
          // So, all messages in the snapshot are considered "recent" in this context.
          recentMessagesToInclude = currentDisplayedMessagesSnapshot;
        }
      } else {
        // No summaries yet, all messages in the snapshot are "recent".
        recentMessagesToInclude = currentDisplayedMessagesSnapshot;
      }
      
      recentMessagesToInclude.forEach(msg => {
        // newUserMessage is already filtered out implicitly as it's not in currentDisplayedMessagesSnapshot
        messagesForApi.push({
          role: (msg.role === "user" ? "user" : "system") as "user" | "system",
          content: msg.content,
          attachments: msg.attachments,
        });
      });
      
      // Add the new user message itself
      messagesForApi.push({
        role: (newUserMessage.role === "user" ? "user" : "system") as "user" | "system",
        content: newUserMessage.content,
        attachments: newUserMessage.attachments,
      });
      
      // ... (rest of sendNewQuery: create bot message placeholder, call ChatApiService.callLlmChat)
      // ... (Make sure the callbacks for onReasoningStart etc. are still correctly wired)
      let reasoningStartTimeForThisQuery: number | null = null;
      const botMessage = createMessage({
        role: "system", content: "", reasoning: "", isReasoning: false, 
        streaming: true, model: modelConfig.name, syncState: MessageSyncState.PENDING_CREATE,
      });
      const localBotMessageId = botMessage.id;
      setDisplayedMessages((prev) => [...prev, botMessage]);

      ChatApiService.callLlmChat(apiClient, {
        messages: messagesForApi,
        config: { ...modelConfig, stream: true, reasoning: modelConfig.reasoning },
        onReasoningStart: () => {
          reasoningStartTimeForThisQuery = Date.now();
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { ...msg, isReasoning: true, reasoning: msg.reasoning || "" } 
                : msg
            )
          );
          callbacks?.onReasoningStart?.(localBotMessageId);
        },
        onReasoningChunk: (_messageId, chunk) => {
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
          if (reasoningStartTimeForThisQuery !== null) {
            duration = Date.now() - reasoningStartTimeForThisQuery;
            reasoningStartTimeForThisQuery = null;
          }
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId ? { ...msg, isReasoning: false, reasoningTime: duration } : msg
            )
          );
          callbacks?.onReasoningEnd?.(localBotMessageId);
        },
        onContentChunk: (_messageId, chunk) => {
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
          finalizeStreamedBotMessage(localBotMessageId, finalMainContent, new Date(timestamp));
          callbacks?.onSuccess?.(localBotMessageId, finalMainContent, new Date(timestamp));
          ChatControllerPool.remove(sessionId, localBotMessageId);
        },
        onError(error: Error) {
          console.log(`[useChatSessionManager] onError:`, error);
          if (error.name === "AbortError") {
            console.log(`[useChatSessionManager] onError: AbortError. Ignoring.`);
            let finalContent: string = "";
            setDisplayedMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === localBotMessageId) {
                  console.log(`[useChatSessionManager] onError: Finalizing last bot message. ID: ${localBotMessageId}, Content: ${msg.content}`);
                  finalizeStreamedBotMessage(localBotMessageId, msg.content as string, new Date());
                  callbacks?.onSuccess?.(localBotMessageId, msg.content as string, new Date());
                  finalContent = msg.content as string;
                }
                return msg;
              })
            );

            return;
          }
          
          let duration = 0;
          if (reasoningStartTimeForThisQuery !== null) {
            duration = Date.now() - reasoningStartTimeForThisQuery;
            reasoningStartTimeForThisQuery = null;
          }
          setDisplayedMessages((prev) =>
            prev.map((msg) =>
              msg.id === localBotMessageId
                ? { 
                    ...msg, 
                    isError: true, 
                    streaming: false, 
                    isReasoning: false,
                    reasoningTime: duration, 
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
          ChatControllerPool.addController(sessionId,localBotMessageId,controller);
          callbacks?.onController?.(controller);
        }
      });
    },
    // Removed store.sessions from dependencies, added local summary states
    [apiClient, sessionId, modelConfig, localSummaries, localLastSummarizedMessageId, finalizeStreamedBotMessage] 
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
    async (fromMessageId: UUID) => {
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
      const messageIdsToRemove = displayedMessages.slice(clearIndex).map(msg => msg.id);
      await apiClient.app.deleteMessages(sessionId, messageIdsToRemove).then(response => {
        console.log("[useChatSessionManager] deleteMessages response:", response);
      }).catch(error => {
        console.error("[useChatSessionManager] deleteMessages error:", error);
      });

      if (clearIndex > 0) {
        setDisplayedMessages((prev) => prev.slice(0, clearIndex));
      } else {
        setDisplayedMessages([]);
      }
    },
    [apiClient, sessionId, displayedMessages]
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
