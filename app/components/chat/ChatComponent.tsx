'use client'

import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { useDebouncedCallback } from "use-debounce"; // Added import
// import { shallow } from "zustand/shallow"; // Remove shallow import

import {
//   ChatMessage,
//   ChatSession,
//   createMessage,
  useAppConfig,
  useChatStore,
  // StoreKey, // Removed unused import
} from "@/app/store"; // Adjust path
import { MultimodalContent } from "@/app/client/api";
import { ChatMessage, ChatSession, createMessage } from "@/app/types";

import {
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  safeLocalStorage,
  selectOrCopy,
  useMobileScreen,
} from "@/app/utils"; // Adjust path
import {prettyObject
  } from "@/app/utils/format"; // Adjust path
import { ChatControllerPool } from "@/app/client/controller"; // Adjust path
import { CHAT_PAGE_SIZE, REQUEST_TIMEOUT_MS } from "@/app/constant"; // Adjust path
// Removed: import { useCommand } from "@/app/command"; // Adjust path

// Removed: import { showPrompt, showToast } from "@/app/components/ui-lib"; // Adjust path
import Locale from "@/app/locales"; // Adjust path
import { useScrollToBottom } from "@/app/hooks/useScrollToBottom"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook

import { ClearContextDivider } from "@/app/components/chat/ClearContextDivider";
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Import the new input panel
import { FormattedDate } from "@/app/components/FormattedDate"; // Import the new component
import { ChatMessageCell } from "@/app/components/chat/ChatMessageCell"; // Import the new cell component

// MUI Imports
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button 
} from "@mui/material";
import LoopIcon from '@mui/icons-material/Loop'; // Loading icon alternative
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';

import styles from "./chat.module.scss";
import { ChatAction } from "./ChatAction"; // Import ChatAction
import { useApiClient } from "@/app/context/ApiProviderContext"; // <-- Import hook
import { ChatComponentSkeleton } from "./ChatComponentSkeleton"; // <-- Import Skeleton

// Dynamic import for Markdown component
const Markdown = dynamic(async () => (await import("../markdown")).Markdown, {
  loading: () => <LoopIcon className={styles.loadingIcon}/>, // Use MUI LoopIcon for loading
});

const localStorage = safeLocalStorage();

// Restore ChatComponentProps interface
interface ChatComponentProps {
    session: ChatSession | undefined; // Allow session to be potentially undefined initially
    onUpdateSession: (session: ChatSession) => void; // Callback to update session state in parent
    // Add missing props expected by Chat.tsx
    onShowConfirmDialog: (title: string, content: string, onConfirm: () => void) => void; 
    onShowEditMessageModal: (message: ChatMessage) => void;
    onShowPromptModal: (session: ChatSession) => void;
    setShowPromptModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
}

let renderCount = 0; // Module-level counter for renders

// This component now focuses on rendering the message list and coordinating with the input panel
export function ChatComponent(props: ChatComponentProps) {
  // Restore prop destructuring, including new props
  const {
    session, 
    onUpdateSession, 
    onShowConfirmDialog, // Destructure new prop
    onShowEditMessageModal, // Destructure new prop
    onShowPromptModal, // Destructure new prop
    setShowPromptModal, 
    setShowShortcutKeyModal
  } = props;

  renderCount++;
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  // const session = chatStore.currentSession(); // Get session from props instead
  const config = useAppConfig();
  const { showSnackbar } = useSnackbar(); // Use Snackbar hook
  const updateTargetSession = useChatStore((state) => state.updateTargetSession);

  console.log(`[ChatComponent] Render #${renderCount}: Received session.id=${session?.id} via prop`);

  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  const isMobileScreen = useMobileScreen();

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hitBottom, setHitBottom] = useState(true);
  const inputPanelRef = useRef<HTMLDivElement>(null);
  const [buttonBottomOffset, setButtonBottomOffset] = useState<number | null>(null);

  // Derive streaming state from last message
  const lastMessage = session?.messages[session.messages.length - 1];
  const isBotStreaming = !!(lastMessage?.role === 'assistant' && lastMessage.streaming);

  const combinedIsLoading = isBotStreaming || isSubmitting;

  // Scroll handling
  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !hitBottom,
    session?.messages ?? [],
  );

  const apiClient = useApiClient(); 

  // Submit handler passed to ChatInputPanel
  const doSubmit = useCallback(
    (input: string, images: string[]) => {
      if (!session) return; // Add session check
      if (combinedIsLoading) return; // Prevent submission if already loading/submitting

      setIsSubmitting(true); // Set submitting true
      chatStore
        .onUserInput(input, apiClient, images)
        .then(() => setIsSubmitting(false)) // Set submitting false on success
        .catch((e) => {
          console.error("[Chat] Failed user input", e);
          setIsSubmitting(false); // Set submitting false on error
          showSnackbar(Locale.Store.Error, 'error');
        });
      chatStore.setLastInput(input); // Keep track of last input
      setAutoScroll(true);
    },
    [session, combinedIsLoading, chatStore, setAutoScroll, showSnackbar, apiClient], // ADDED combinedIsLoading dependency
  );

  // Stop response
  const onUserStop = (messageId: string) => {
    if (!session) return; // Add session check
    ChatControllerPool.stop(session.id, messageId);
  };

  // Cleanup stale messages
  useEffect(() => {
    // Use the session object from props
    if (!session?.id || !session.messages) return; // Check session and messages exist
    console.log(`[ChatComponent] Stale message check effect run for session.id=${session.id}`);

    let needsUpdate = false;
    const messagesToUpdate: { id: string; changes: Partial<ChatMessage> }[] = [];
    const stopTimingCheck = Date.now() - REQUEST_TIMEOUT_MS;

    for (const m of session.messages) {
      // Ensure message has an ID before proceeding
      if (!m.id) continue;

      const messageText = getMessageTextContent(m); // Get text content once
      const isTimedOut = m.streaming && new Date(m.date).getTime() < stopTimingCheck;
      // Check if it's streaming, empty, and NOT already an error
      const isEmptyStreaming = m.streaming && messageText.length === 0 && !m.isError; // Renamed for clarity

      let currentChanges: Partial<ChatMessage> = {};

      // Condition 1: Message has timed out
      if (isTimedOut) {
        currentChanges.streaming = false; // Stop streaming if timed out

        // Also mark as error if it was empty AND timed out
        if (isEmptyStreaming) {
             currentChanges.isError = true;
             currentChanges.content = prettyObject({
               error: true,
               message: "empty response and timed out", // More specific error message
             });
        }
        // Optional: Handle timeout even if content exists, maybe just stop streaming?
        // If just timed out but had content, only `streaming = false` is set.
      }
      // Condition 2: Already marked as error, but somehow still streaming
      else if (m.isError && m.streaming) {
        currentChanges.streaming = false; // Just ensure streaming is false
      }

      // Only add if there are actual changes needed for this message
      if (Object.keys(currentChanges).length > 0) {
        needsUpdate = true;
        // Check if this message already has updates scheduled, merge if necessary
        const existingUpdateIndex = messagesToUpdate.findIndex(update => update.id === m.id);
        if (existingUpdateIndex !== -1) {
          Object.assign(messagesToUpdate[existingUpdateIndex].changes, currentChanges);
        } else {
          messagesToUpdate.push({ id: m.id, changes: currentChanges });
        }
      }
    }

    // Only proceed to update if changes were detected
    if (needsUpdate && messagesToUpdate.length > 0) {
      // console.log("[ChatComponent Effect] Stale messages detected, applying updates:", messagesToUpdate);
      // Use the selected action, pass the full session from props
      updateTargetSession(session, (s) => {
        messagesToUpdate.forEach(({ id, changes }) => {
          const messageIndex = s.messages.findIndex((msg) => msg.id === id);
          if (messageIndex !== -1) {
            // Apply the specific changes needed
            Object.assign(s.messages[messageIndex], changes);
            // console.log(` -- Message ${id} updated with changes:`, changes);
          }
        });
      });
    } else {
      // console.log("[ChatComponent Effect] No stale messages detected for session:", session.id);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Depend on session object (reference check) and the stable update action
  }, [session, updateTargetSession, REQUEST_TIMEOUT_MS]);

  // Delete message handler
  const deleteMessage = useCallback(
    (msgId?: string) => {
      if (!session) return; // Add session check
      chatStore.updateTargetSession(
        session,
        (s) => (s.messages = s.messages.filter((m) => m.id !== msgId)),
      );
    },
    [chatStore, session],
  );

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  // Resend message handler (bot messages)
  const onResend = useCallback(
    (message: ChatMessage) => {
      if (!session || message.role !== 'assistant') return; // Only allow resend for bot messages
      const resendingIndex = session.messages.findIndex((m) => m.id === message.id);
      if (resendingIndex <= 0) return; // Need a preceding message

      let userMessage: ChatMessage | undefined;
      // Find the preceding user message
      for (let i = resendingIndex - 1; i >= 0; i--) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }

      if (!userMessage) {
        console.error("[Chat] Cannot find user message to resend for bot message:", message);
        return;
      }

      if (combinedIsLoading) return; // Use combined state to prevent multiple resends

      // Find the index of the user message
      const startIndex = session.messages.findIndex((m) => m.id === userMessage!.id);
      if (startIndex === -1) {
          console.error("[Chat] Could not find start index for resend");
          return;
      }

      // Mark all messages from the user message onwards for deletion
      const messagesToDelete = session.messages.slice(startIndex).map(m => m.id).filter(id => !!id) as string[];

      if (messagesToDelete.length > 0) {
        chatStore.updateTargetSession(
          session,
          (s) => (s.messages = s.messages.filter((m) => !messagesToDelete.includes(m.id!))),
        );
      }

      setIsSubmitting(true); // Set submitting true
      const textContent = getMessageTextContent(userMessage);
      const images = getMessageImages(userMessage);
      chatStore.onUserInput(textContent, apiClient, images)
        .then(() => setIsSubmitting(false)) // Set submitting false
        .catch((e) => {
          console.error("[Chat] Failed resend", e);
          setIsSubmitting(false); // Set submitting false
          showSnackbar(Locale.Store.Error, 'error');
        });

      setAutoScroll(true);
    },
    [session, combinedIsLoading, chatStore, showSnackbar, setAutoScroll, apiClient], // ADDED combinedIsLoading dependency
  );

  // Edit Submit handler (user messages) - NEW
  const onEditSubmit = useCallback(
    (originalMessage: ChatMessage, newText: string) => {
      if (!session || originalMessage.role !== 'user') return; 
      if (combinedIsLoading) return; // Use combined state

      const editIndex = session.messages.findIndex((m) => m.id === originalMessage.id);
      if (editIndex < 0) {
        console.error("[Chat] Cannot find message to edit:", originalMessage);
        return;
      }

      // Remove messages from the edit index onwards
      const messagesToDelete = session.messages.slice(editIndex).map(m => m.id).filter(id => !!id) as string[];

      if (messagesToDelete.length > 0) {
        chatStore.updateTargetSession(
          session,
          (s) => (s.messages = s.messages.filter((m) => !messagesToDelete.includes(m.id!))),
        );
      }

      setIsSubmitting(true); // Set submitting true
      chatStore.onUserInput(newText, apiClient, []) 
        .then(() => setIsSubmitting(false)) // Set submitting false
        .catch((e) => {
          console.error("[Chat] Failed edit submission", e);
          setIsSubmitting(false); // Set submitting false
          showSnackbar(Locale.Store.Error, 'error');
        });

      chatStore.setLastInput(newText); // Update last input
      setAutoScroll(true);
      setTimeout(scrollDomToBottom, 0); // Scroll after state update
    },
    [session, combinedIsLoading, chatStore, showSnackbar, setAutoScroll, scrollDomToBottom, apiClient] // ADDED combinedIsLoading dependency
  );

  // Pin message handler
  const onPinMessage = (message: ChatMessage) => {
    if (!session) return; // Add session check
    chatStore.updateTargetSession(session, (s) => s.context.push(message));
    showSnackbar(Locale.Chat.Actions.PinToastContent, 'success'); // Simple success message for pin
  };

  // Message rendering logic
  const context = useMemo(() => {
    if (!session) return []; // Default to empty array if no session
    return session.hideContext ? [] : session.context.slice();
  }, [session]); // Depend on session

  // Compute messages to render, including context, session messages, and loading state
  const renderMessages = useMemo(() => {
      const sessionMessages = session?.messages ?? [];
      const messages: RenderMessage[] = context.concat(sessionMessages as RenderMessage[]);
      
      return messages;
  }, [context, session?.messages]);

  // Paginated message rendering
  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );

  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  // Slice messages for current view based on pagination
  const messagesToRender = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE, // Load more messages ahead
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  // Update render index when messages change to ensure view stays relevant
  useEffect(() => {
      const newIndex = Math.max(0, renderMessages.length - CHAT_PAGE_SIZE);
      if (hitBottom) { // Only auto-scroll to new index if already at bottom
          _setMsgRenderIndex(newIndex);
      }
  }, [renderMessages.length, hitBottom]);

  // Debounced pagination logic
  const debouncedCheckEdges = useDebouncedCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      const edgeThreshold = clientHeight;
      const isTouchTopEdge = scrollTop <= edgeThreshold;
      const isTouchBottomEdge = scrollHeight > 0 && scrollTop + clientHeight >= scrollHeight - edgeThreshold;

      // Check if already loading the next page to prevent multiple triggers
      // This might need refinement based on how loading state is tracked

      if (isTouchTopEdge && msgRenderIndex > 0) {
        console.log("[ChatComponent] Debounced: Touching top edge, loading previous messages");
        setMsgRenderIndex(msgRenderIndex - CHAT_PAGE_SIZE);
      } else if (
        isTouchBottomEdge &&
        msgRenderIndex + messagesToRender.length < renderMessages.length
      ) {
        console.log("[ChatComponent] Debounced: Touching bottom edge, loading next messages");
        setMsgRenderIndex(msgRenderIndex + CHAT_PAGE_SIZE);
      }
    },
    100, // Debounce time in ms
    { leading: false, trailing: true } // Trigger on the trailing edge of the wait timeout
  );

  // Scroll handler for message body
  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;

    // Calculate hitBottom immediately
    const isHitBottom = scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    setHitBottom(isHitBottom);

    // Call the debounced function for edge checks/pagination
    debouncedCheckEdges(scrollTop, scrollHeight, clientHeight);
  };

  // Function to explicitly scroll to bottom
  const internalScrollToBottom = useCallback(() => {
    setMsgRenderIndex(Math.max(0, renderMessages.length - CHAT_PAGE_SIZE));
    scrollDomToBottom();
  }, [renderMessages.length, scrollDomToBottom]);

  // Calculate index for the clear context divider
  const clearContextIndex = useMemo(() => {
    if (!session) return -1; // Default if no session
    const clearIdx = session.clearContextIndex;
    return clearIdx !== undefined && clearIdx >= 0
      ? clearIdx + context.length - msgRenderIndex // Adjust index based on current view
      : -1;
  }, [session?.clearContextIndex, context.length, msgRenderIndex]); // Depend on session?.clearContextIndex

  // Command Hook (if needed for actions triggered outside input, e.g., URL)
  // useCommand({ ... });

  // Focus input on component mount (consider if needed)
  // useEffect(() => { ... focus logic ... }, []);

  // Function to calculate button offset (extracted for reuse)
  const calculateButtonOffset = useCallback(() => {
    const inputPanel = inputPanelRef.current;
    if (!inputPanel) return;
    const panelHeight = inputPanel.offsetHeight;
    const panelMarginTop = 32; // From .chat-input-panel margin: 32px auto;
    const desiredGap = 10; // 10px gap above the panel
    setButtonBottomOffset(panelHeight + panelMarginTop + desiredGap);
  }, []); // Empty dependency array as it relies on the ref

  // Debounced session update
  const debouncedUpdateSession = useDebouncedCallback(onUpdateSession, 200);

  // Auto-scroll effect
  useLayoutEffect(() => {
      // Add check for session before accessing messages
      if (session) { 
        scrollDomToBottom();
      }
  }, [session?.messages.length, scrollDomToBottom]); // Use optional chaining and correct dependency

  // Event handlers passed to ChatInputPanel
  const onInput = useCallback((text: string) => {

  }, []);

  console.log(`[ChatComponent] Render #${renderCount}: Finished render logic for session.id=${session?.id}`);

  // ---------- Render ----------
  // Render Skeleton if session is not available
  if (!session) {
    return (
      <div className={styles["chat-body-container"]}>
          <ChatComponentSkeleton />
      </div>
    );
  }

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
        {messagesToRender.map((message, i) => {
          const globalMessageIndex = msgRenderIndex + i;
          const isUser = message.role === "user";
          const isContext = globalMessageIndex < context.length;
          // Show actions for non-context, non-preview, non-empty, non-error messages
          // Let ChatMessageCell handle conditional rendering based on role
          const showActions =
            !isContext &&
            !(message.preview || message.content.length === 0 || message.isError) &&
            globalMessageIndex >= 0;

          const shouldShowClearContextDivider = globalMessageIndex === clearContextIndex;

          return (
            <Fragment key={message.id || `msg-${globalMessageIndex}`}> 
              <ChatMessageCell
                message={message}
                index={globalMessageIndex}
                isUser={isUser}
                isContext={isContext}
                isLoading={combinedIsLoading} // Pass combined loading state down if needed by actions inside cell
                showActions={showActions}
                fontSize={fontSize}
                fontFamily={fontFamily}
                scrollRef={scrollRef}
                renderMessagesLength={renderMessages.length}
                onResend={onResend}
                onDelete={onDelete}
                onUserStop={onUserStop}
                onEditSubmit={onEditSubmit}
              />
              {shouldShowClearContextDivider && <ClearContextDivider />}
            </Fragment>
          );
        })} 
      </div>

      {/* Chat Input Panel - Pass the ref */}
      <ChatInputPanel
        ref={inputPanelRef} // Pass the ref here
        session={session}
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