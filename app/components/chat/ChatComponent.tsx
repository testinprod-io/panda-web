"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useDebouncedCallback } from "use-debounce"; // Added import

import { useAppConfig, useChatStore } from "@/app/store"; // Adjust path
import {
  EncryptedMessage,
  ChatSession,
  ChatMessage,
} from "@/app/types";

import { useMobileScreen } from "@/app/utils"; // Adjust path
import { ChatControllerPool } from "@/app/client/controller";

import Locale from "@/app/locales"; // Adjust path
import { useScrollToBottom } from "@/app/hooks/useScrollToBottom"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook

import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Import the new input panel
import { ChatMessageCell } from "@/app/components/chat/ChatMessageCell"; // Import the new cell component
import { ChatMessageCellSkeleton } from "@/app/components/chat/ChatMessageCellSkeleton"; // Import the new skeleton component

import LoopIcon from "@mui/icons-material/Loop"; // Loading icon alternative
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";

import styles from "./chat.module.scss";
import { ChatAction } from "./ChatAction"; // Import ChatAction
import { useApiClient } from "@/app/context/ApiProviderContext"; // <-- Import hook
import { getAccessToken } from "@privy-io/react-auth";
import { useDecryptionManager } from "@/app/hooks/useDecryptionManager"; // <-- Import the hook
import { useChatSessionManager } from "@/app/hooks/useChatSessionManager";
import { UUID } from "crypto";

// Restore ChatComponentProps interface
interface ChatComponentProps {
  // session: ChatSession | undefined; // Allow session to be potentially undefined initially
  sessionId: UUID;
  onUpdateSession: (session: ChatSession) => void; // Callback to update session state in parent
  // Add missing props expected by Chat.tsx
  onShowConfirmDialog: (
    title: string,
    content: string,
    onConfirm: () => void
  ) => void;
  onShowEditMessageModal: (message: EncryptedMessage) => void;
  onShowPromptModal: (session: ChatSession) => void;
  setShowPromptModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
}
// This component now focuses on rendering the message list and coordinating with the input panel
export function ChatComponent(props: ChatComponentProps) {
  // Restore prop destructuring, including new props
  const {
    // session,
    sessionId,
    onUpdateSession,
  } = props;

  console.log("[ChatComponent] Rendering. Session ID:", sessionId);

  const chatStore = useChatStore();
  const config = useAppConfig();
  const { showSnackbar } = useSnackbar(); // Use Snackbar hook

  // Ref to track if the initial sessionStorage message has been processed for the current sessionId
  const initialMessageProcessedRef = useRef<string | null>(null);

  // ** Decryption Hook Integration **
  const {
    decryptMessages,
    getDecryptedContent,
    isLoading: isDecryptingMessage,
  } = useDecryptionManager();

  // Get Encrypted Messages from session
  // const encryptedMessages = useMemo(() => session?.messages ?? [], [session?.messages]);

  // ** Trigger Decryption **
  // useEffect(() => {
  //   if (encryptedMessages.length > 0) {
  //     console.log('[ChatComponent] Decryption useEffect: Preparing messages for decryption for session:', session?.id, encryptedMessages.map(m => m.id));
  //     const messagesToDecrypt = encryptedMessages.map(msg => {
  //       return {
  //         ...msg,
  //         content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  //       };
  //     });
  //     decryptMessages(messagesToDecrypt as any);
  //   }

  //   // ** Cleanup: REMOVED clearCache() call from here **
  //   // The cache should persist for the current session.
  //   // If session.id changes, ChatComponent remounts (due to its key),
  //   // and useDecryptionManager re-initializes with a fresh cache.
  //   return () => {
  //     // console.log('[ChatComponent] Cleanup for decryption effect. Previous session ID was:', session?.id);
  //     // No longer calling clearCache() here to avoid clearing it on every message update within the same session.
  //   };
  // }, [sessionId, encryptedMessages, decryptMessages]); // Added decryptMessages to the dependency array.

  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  const isMobileScreen = useMobileScreen();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hitBottom, setHitBottom] = useState(true);
  const inputPanelRef = useRef<HTMLDivElement>(null);
  const [buttonBottomOffset, setButtonBottomOffset] = useState<number | null>(
    null
  );

  const {
    displayedMessages,
    isLoading,
    hasMoreMessages,
    messageFetchError,
    loadMoreMessages,
    clearMessages,
    addOptimisticMessage,
    sendNewQuery,
    updateOptimisticMessage,
    sendNewUserMessage,
    // addStreamedBotMessageChunk,
    finalizeStreamedBotMessage,
    markMessageAsError,
  } = useChatSessionManager(sessionId, config.modelConfig);

  // Derive streaming state from last *encrypted* message
  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const isBotStreaming = !!(
    lastMessage?.role === "assistant" && lastMessage.streaming
  );

  const combinedIsLoading = isBotStreaming || isSubmitting;

  console.log("access token", getAccessToken);
  // Scroll handling
  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !hitBottom,
    displayedMessages as any // Cast to any as workaround if hook expects ChatMessage[]
  );

  const apiClient = useApiClient();
  // Submit handler passed to ChatInputPanel
  const doSubmit = useCallback(
    (input: string, images: string[]) => {
      if (combinedIsLoading) return; // Prevent submission if already loading/submitting

      sendNewUserMessage(input, images, {
        onStart: () => setIsSubmitting(true),
        onStreaming: (partialMessage: string) => {},
        onSuccess: () => setIsSubmitting(false),
        onFailure: (error: Error) => {
          console.error("[Chat] Failed user input", error);
          setIsSubmitting(false); // Set submitting false on error
          showSnackbar(Locale.Store.Error, "error");
        },
      });
      setAutoScroll(true);
    },
    [
      sessionId,
      combinedIsLoading,
      sendNewUserMessage,
      setAutoScroll,
      showSnackbar,
    ] // ADDED combinedIsLoading dependency
  );

  // Stop response
  const onUserStop = useCallback(
    (messageId: string) => {
      // if (!session) return; // Add session check
      ChatControllerPool.stop(sessionId, messageId);
    },
    [sessionId]
  );

  // Cleanup stale messages
  // useEffect(() => {
  //   // Use the session object from props
  //   if (!session?.id || !encryptedMessages) return; // Check session and messages exist
  //   console.log(`[ChatComponent] Stale message check effect run for session.id=${session.id}`);

  //   let needsUpdate = false;
  //   const messagesToUpdate: { id: string; changes: Partial<EncryptedMessage> }[] = [];
  //   const stopTimingCheck = Date.now() - REQUEST_TIMEOUT_MS;

  //   for (const m of encryptedMessages) {
  //     // Ensure message has an ID before proceeding
  //     if (!m.id) continue;

  //     const isTimedOut = m.streaming && new Date(m.date).getTime() < stopTimingCheck;
  //     // Check if it's streaming AND already marked as error (transient state)
  //     const isEmptyStreaming = m.streaming && !m.isError; // Simpler check based on transient state

  //     let currentChanges: Partial<EncryptedMessage> = {};

  //     // Condition 1: Message has timed out
  //     if (isTimedOut) {
  //       currentChanges.streaming = false; // Stop streaming if timed out

  //       // Mark as error ONLY if it was streaming and timed out (regardless of content presence)
  //       // We cannot check content length here easily.
  //       if (m.streaming) {
  //            currentChanges.isError = true;
  //            // Cannot set content here, error is just a flag
  //       }
  //     }
  //     // Condition 2: Already marked as error, but somehow still streaming
  //     else if (m.isError && m.streaming) {
  //       currentChanges.streaming = false; // Just ensure streaming is false
  //     }

  //     // Only add if there are actual changes needed for this message
  //     if (Object.keys(currentChanges).length > 0) {
  //       needsUpdate = true;
  //       // Check if this message already has updates scheduled, merge if necessary
  //       const existingUpdateIndex = messagesToUpdate.findIndex(update => update.id === m.id);
  //       if (existingUpdateIndex !== -1) {
  //         Object.assign(messagesToUpdate[existingUpdateIndex].changes, currentChanges);
  //       } else {
  //         messagesToUpdate.push({ id: m.id, changes: currentChanges });
  //       }
  //     }
  //   }

  //   // Only proceed to update if changes were detected
  //   if (needsUpdate && messagesToUpdate.length > 0) {
  //     // console.log("[ChatComponent Effect] Stale messages detected, applying updates:", messagesToUpdate);
  //     // Use the selected action, pass the full session from props
  //     updateTargetSession({ id: session.id }, (s) => {
  //       messagesToUpdate.forEach(({ id, changes }) => {
  //         const messageIndex = s.messages.findIndex((msg) => msg.id === id);
  //         if (messageIndex !== -1) {
  //           // Apply the specific changes needed
  //           Object.assign(s.messages[messageIndex], changes);
  //           // console.log(` -- Message ${id} updated with changes:`, changes);
  //         }
  //       });
  //     });
  //   } else {
  //     // console.log("[ChatComponent Effect] No stale messages detected for session:", session.id);
  //   }

  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // // Depend on session object (reference check) and the stable update action
  // }, [session?.id, encryptedMessages, updateTargetSession, REQUEST_TIMEOUT_MS]);

  // Resend message handler (bot messages)
  const onResend = useCallback(
    async (messageId: UUID) => {
      // if (!session || message.role !== 'assistant') return; // Only allow resend for bot messages
      const resendingMessageId = messageId;
      const resendingIndex = displayedMessages.findIndex(
        (m) => m.id === resendingMessageId
      );
      if (resendingIndex <= 0) return; // Need a preceding message

      let userMessage: ChatMessage | undefined;
      // Find the preceding user message
      const messages = displayedMessages.slice(0, resendingIndex);
      clearMessages(messageId);

      if (combinedIsLoading) return; // Prevent submission if already loading/submitting
      sendNewQuery(messages, {
        onStart: () => setIsSubmitting(true),
        onStreaming: (partialMessage: string) => {},
        onSuccess: () => setIsSubmitting(false),
        onFailure: (error: Error) => {
          console.error("[Chat] Failed user input", error);
          setIsSubmitting(false); // Set submitting false on error
          showSnackbar(Locale.Store.Error, "error");
        },
      });
      setAutoScroll(true);

      // for (let i = resendingIndex - 1; i >= 0; i--) {
      //   if (displayedMessages[i].role === "user") {
      //     userMessage = displayedMessages[i];
      //     break;
      //   }
      // }

      // if (!userMessage) {
      //   console.error("[Chat] Cannot find user message to resend for bot message:", message);
      //   return;
      // }

      // if (combinedIsLoading) return; // Use combined state to prevent multiple resends

      // Find the index of the user message
      // const startIndex = displayedMessages.findIndex((m) => m.id === userMessage!.id);
      // if (startIndex === -1) {
      //     console.error("[Chat] Could not find start index for resend");
      //     return;
      // }

      // Mark all messages from the user message onwards for deletion
      // const messagesToDelete = displayedMessages.slice(startIndex).map(m => m.id).filter(id => !!id) as string[];

      // if (messagesToDelete.length > 0) {
      //   chatStore.updateTargetSession(
      //     { id: sessionId },
      //     (s) => (s.messages = s.messages.filter((m) => !messagesToDelete.includes(m.id!))),
      //   );
      // }

      // doSubmit(userMessage!.content, []);
      // setIsSubmitting(true); // Set submitting true
      // const textContent = getMessageTextContent(userMessage);
      // const images = getMessageImages(userMessage);
      // onUserInput(textContent, images)
      //   .then(() => setIsSubmitting(false)) // Set submitting false
      //   .catch((e) => {
      //     console.error("[Chat] Failed resend", e);
      //     setIsSubmitting(false); // Set submitting false
      //     showSnackbar(Locale.Store.Error, 'error');
      //   });

      // setAutoScroll(true);
    },
    [
      sessionId,
      combinedIsLoading,
      sendNewUserMessage,
      setAutoScroll,
      showSnackbar,
    ] // ADDED combinedIsLoading dependency
  );

  // Edit Submit handler (user messages) - NEW
  const onEditSubmit = useCallback(
    async (messageId: UUID, newText: string) => {
      // if (!session || originalMessage.role !== 'user') return;
      if (combinedIsLoading) return; // Use combined state

      const editIndex = displayedMessages.findIndex(
        (m) => m.id === originalMessage.id
      );
      if (editIndex < 0) {
        console.error("[Chat] Cannot find message to edit:", originalMessage);
        return;
      }

      // Remove messages from the edit index onwards
      const messagesToDelete = displayedMessages
        .slice(editIndex)
        .map((m) => m.id)
        .filter((id) => !!id) as string[];

      if (messagesToDelete.length > 0) {
        chatStore.updateTargetSession(
          { id: sessionId },
          (s) =>
            (s.messages = s.messages.filter(
              (m) => !messagesToDelete.includes(m.id!)
            ))
        );
      }

      setIsSubmitting(true); // Set submitting true
      onUserInput(newText, [])
        .then(() => setIsSubmitting(false)) // Set submitting false
        .catch((e) => {
          console.error("[Chat] Failed edit submission", e);
          setIsSubmitting(false); // Set submitting false
          showSnackbar(Locale.Store.Error, "error");
        });

      chatStore.setLastInput(newText); // Update last input
      setAutoScroll(true);
      setTimeout(scrollDomToBottom, 0); // Scroll after state update
    },
    [
      sessionId,
      combinedIsLoading,
      chatStore,
      showSnackbar,
      setAutoScroll,
      scrollDomToBottom,
      apiClient,
    ] // ADDED combinedIsLoading dependency
  );

  // Message rendering logic
  // const context = useMemo(() => {
  //   if (!session) return []; // Default to empty array if no session
  //   console.warn("[Chat] Context feature needs review with encrypted messages.")
  //   return []; // Placeholder: Disable context for now
  // }, [session]); // Depend on session

  // Compute messages to render, including context, session messages, and loading state
  const renderMessages = useMemo(() => {
    // const messages = context.concat(encryptedMessages);
    return displayedMessages;
    // return messages;
  }, [displayedMessages]);

  // Slice messages for current view based on pagination
  const messagesToRender = useMemo(() => {
    return renderMessages; // Render all messages
  }, [renderMessages]);
  console.log("[ChatComponent] messagesToRender:", messagesToRender);
  // Debounced pagination logic
  const debouncedCheckEdges = useDebouncedCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      const edgeThreshold = 50; // Pixels from the top to trigger loading
      const isTouchTopEdge = scrollTop <= edgeThreshold;

      if (isTouchTopEdge && !combinedIsLoading) {
        loadMoreMessages();
      }
    },
    200, // Debounce time in ms, adjust as needed
    { leading: false, trailing: true } // Trigger on the trailing edge of the wait timeout
  );

  // // Scroll handler for message body
  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;

    // Calculate hitBottom immediately
    const newIsHitBottom =
      scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    if (newIsHitBottom !== hitBottom) {
      setHitBottom(newIsHitBottom);
    }
    // Call the debounced function for edge checks/pagination
    debouncedCheckEdges(scrollTop, scrollHeight, clientHeight);
  };

  // Function to explicitly scroll to bottom
  const internalScrollToBottom = useCallback(() => {
    scrollDomToBottom();
  }, [scrollDomToBottom]);

  // Auto-scroll effect for session changes/initial load
  // const isAnythingCurrentlyDecrypting = useMemo(() => {
  //   if (!session || !encryptedMessages || encryptedMessages.length === 0) {
  //     // console.log('[ChatComponent] isAnythingCurrentlyDecrypting: false (no session or messages)');
  //     return false;
  //   }
  //   const result = encryptedMessages.some(msg => isDecryptingMessage(msg.id));
  //   // console.log('[ChatComponent] isAnythingCurrentlyDecrypting evaluated:', result, 'Session ID:', session?.id);
  //   return result;
  // }, [session, encryptedMessages, isDecryptingMessage]);

  useEffect(() => {
    console.log(
      "[ChatComponent] sessionStorage useEffect running. Session ID:",
      sessionId
    );
    // Process only if sessionId is present and hasn't been processed for this sessionId yet
    if (sessionId && initialMessageProcessedRef.current !== sessionId) {
      const storedDataString = sessionStorage.getItem(sessionId);
      console.log("[ChatComponent] storedDataString:", storedDataString);
      if (storedDataString) {
        try {
          const parsedData = JSON.parse(storedDataString);
          console.log("[ChatComponent] parsedData:", parsedData);
          // Check if the stored data is for the current session (key is sessionId)
          if (parsedData) {
            console.log(
              "[ChatComponent] sessionStorage data found, submitting message."
            );
            doSubmit(parsedData.input, parsedData.images);
            sessionStorage.removeItem(sessionId); // Clean up
            initialMessageProcessedRef.current = sessionId; // Mark as processed for this sessionId
          }
          // No need for 'else if (parsedData && parsedData.sessionId !== sessionId)' because key is already sessionId
        } catch (error) {
          console.error(
            "Failed to parse pendingChatInput from sessionStorage:",
            error
          );
          sessionStorage.removeItem(sessionId); // Clean up corrupted data
        }
      }
    }
  }, [sessionId, doSubmit]); // Dependencies updated

  useLayoutEffect(() => {
    console.log(
      "[ChatComponent] useLayoutEffect running. Session ID:",
      sessionId,
      "isLoading:",
      isLoading
    );
    if (sessionId && !isLoading) {
      console.log(
        "[ChatComponent] useLayoutEffect: Session available and not loading, calling scrollDomToBottom for session:",
        sessionId
      );
      scrollDomToBottom();
    } else {
      console.log(
        "[ChatComponent] useLayoutEffect: Conditions not met for scroll. Session:",
        sessionId,
        "isLoading:",
        isLoading
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-dep
  }, [sessionId, isLoading, scrollDomToBottom]); // Changed from !isLoading to isLoading

  return (
    <div className={styles["chat-body-container"]}>
      {/* Message List Area */}
      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={onChatBodyScroll}
        onTouchStart={() => {
          setAutoScroll(false);
        }}
      >
        {messagesToRender.map((encryptedMsg, i) => {
          console.log("[ChatComponent] rendering message:", encryptedMsg);
          const globalMessageIndex = i; // msgRenderIndex is removed, so index is direct
          const isContext = false;

          // const decryptedContent = getDecryptedContent(encryptedMsg.id);
          // const isMessageDecrypting = isDecryptingMessage(encryptedMsg.id);

          // console.log(`[ChatComponent] Message ${encryptedMsg.id}:`, {
          //   isDecrypting: isMessageDecrypting,
          //   hasDecryptedContent: !!decryptedContent,
          //   role: encryptedMsg.role,
          //   contentLength: decryptedContent?.length
          // });

          // if (isMessageDecrypting) {
          //   // console.log(`[ChatComponent] Showing skeleton for message ${encryptedMsg.id}`);
          //   return <ChatMessageCellSkeleton key={`${encryptedMsg.id}-loading`} role={encryptedMsg.role} />;
          // }

          // const showActions = !isContext && !(encryptedMsg.isError || decryptedContent === null);

          // console.log(`[ChatComponent] Rendering full message ${encryptedMsg.id}:`, {
          //   showActions,
          //   isError: encryptedMsg.isError || decryptedContent === null,
          //   contentLength: decryptedContent?.length
          // });

          return (
            <Fragment key={encryptedMsg.id}>
              <ChatMessageCell
                messageId={encryptedMsg.id}
                role={encryptedMsg.role}
                decryptedContent={encryptedMsg.content}
                encryptedMessage={encryptedMsg}
                isStreaming={encryptedMsg.streaming}
                isError={encryptedMsg.isError}
                index={globalMessageIndex}
                isLoading={combinedIsLoading}
                showActions={true}
                fontSize={fontSize}
                fontFamily={fontFamily}
                scrollRef={scrollRef}
                renderMessagesLength={renderMessages.length}
                onResend={onResend}
                onUserStop={onUserStop}
                onEditSubmit={onEditSubmit}
              />
            </Fragment>
          );
        })}
      </div>

      {/* Chat Input Panel - Pass the ref */}
      <ChatInputPanel
        ref={inputPanelRef} // Pass the ref here
        sessionId={sessionId}
        modelConfig={config.modelConfig}
        isLoading={combinedIsLoading}
        hitBottom={hitBottom}
        onSubmit={doSubmit}
        scrollToBottom={internalScrollToBottom}
        setShowPromptModal={() => props.setShowPromptModal(true)}
        setShowShortcutKeyModal={() => props.setShowShortcutKeyModal(true)}
      />

      {/* Scroll to Bottom Button - Wrapper for dynamic style */}
      {!hitBottom && buttonBottomOffset !== null && (
        <div
          className={styles["scroll-to-bottom-chatview-wrapper"]}
          style={{ bottom: `${buttonBottomOffset}px` }} // Apply dynamic bottom style to wrapper
        >
          <ChatAction
            onClick={internalScrollToBottom}
            text={null}
            icon={<ArrowDownwardRoundedIcon />}
            className={styles["scroll-to-bottom-chatview"]} // Keep base class for other styles
          />
        </div>
      )}
    </div>
  );
}

export const MemoizedChatComponent = React.memo(ChatComponent); // Export memoized version
