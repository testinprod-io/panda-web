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
import { useDebouncedCallback } from "use-debounce"; // Added import

import { useAppConfig, useChatStore } from "@/store";

import { ChatControllerPool } from "@/client/controller";

import Locale from "@/locales"; // Adjust path
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"; // Adjust path
import { useSnackbar } from "@/providers/snackbar-provider"; // Added Snackbar hook

import { ChatMessageCell } from "@/components/chat/chat-message-cell"; // Import the new cell component

import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CircularProgress from "@mui/material/CircularProgress"; // Assuming MUI is used

import styles from "./chat.module.scss";
import { ActionButton } from "@/components/ui/action-button"; // Import ChatAction
import { useChatSessionManager } from "@/hooks/use-chat-session-manager";
import { UUID } from "crypto";
import { ChatSession, SessionState } from "@/types/session";

// ChatComponentProps is now simpler as it gets most things from the store or direct sessionID
export interface ChatComponentProps {
  sessionId: UUID;
  session: ChatSession;
}

export function ChatComponent(props: ChatComponentProps) {
  const {  sessionId, session  } = props;

  const chatStore = useChatStore();
  // Destructure setters and states from the store
  const {
    setOnSendMessageHandler,
    setHitBottom,
    setScrollToBottomHandler,
    setIsChatComponentBusy,
    // Modal handlers are not directly set by ChatComponent into store for ChatInputPanel,
    // but ChatInputPanel will read them from store (set by Chat.tsx or RootChatGroupLayout)
  } = chatStore;

  const config = useAppConfig();
  const { showSnackbar } = useSnackbar();
  const initialMessageProcessedRef = useRef<string | null>(null);
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [internalHitBottom, setInternalHitBottom] = useState(true); // Local state for UI button

  const previousScrollHeightRef = useRef<number | null>(null);
  const previousScrollTopRef = useRef<number | null>(null);

  const {
    displayedMessages, 
    isLoading: isLoadingMessages, 
    hasMoreMessages, 
    loadMoreMessages, 
    clearMessages, 
    sendNewUserMessage, 
    sendNewQuery,
  } = useChatSessionManager(sessionId, session.modelConfig, session.customizedPrompts);
  
  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const isBotStreaming = !!(lastMessage?.role === "assistant" && lastMessage.streaming);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !internalHitBottom,
    displayedMessages
  );

  // Update store with hitBottom state
  useEffect(() => {
    setHitBottom(internalHitBottom);
  }, [internalHitBottom, setHitBottom]);

  const doSubmit = useCallback(
    async (sessionState: SessionState) => {
      setIsChatComponentBusy(true);
        await new Promise<void>((resolve, reject) => {
          sendNewUserMessage(sessionState, {
            onReasoningStart: () => {},
            onReasoningChunk: (chunk: string) => {},
            onReasoningEnd: () => {},
            onContentChunk: (chunk: string) => {},
            onSuccess: () => {
              setIsChatComponentBusy(false);
              resolve();
            },
            onFailure: (error: Error) => {
              console.error("[ChatComponent] Failed user input", error);
              setIsChatComponentBusy(false);
              showSnackbar(Locale.Store.Error, "error");
              reject(error);
            },
          });
        });
        setAutoScroll(true);

    },
    [sessionId, sendNewUserMessage, setAutoScroll, showSnackbar, setIsChatComponentBusy]
  );

  // Register/unregister submit handler with the store
  useEffect(() => {
    setOnSendMessageHandler(doSubmit);
    return () => {
      setOnSendMessageHandler(null); // Clear handler on component unmount or session change
    };
  }, [setOnSendMessageHandler, doSubmit]);

  const internalScrollToBottom = useCallback(() => {
    scrollDomToBottom();
  }, [scrollDomToBottom]);

  // Register/unregister scroll to bottom handler with the store
  useEffect(() => {
    setScrollToBottomHandler(internalScrollToBottom);
    return () => {
      setScrollToBottomHandler(null);
    };
  }, [setScrollToBottomHandler, internalScrollToBottom]);

  // Session storage effect (for initial message on new chat) - remains the same logic
  useEffect(() => {
    if (sessionId && initialMessageProcessedRef.current !== sessionId) {
      const storedDataString = localStorage.getItem(sessionId);
      if (storedDataString) {
        try {
          const { sessionState } = JSON.parse(storedDataString) as { sessionState: SessionState };
          if (sessionState) {
            // doSubmit will set isChatComponentBusy
            doSubmit(sessionState);
            localStorage.removeItem(sessionId);
            initialMessageProcessedRef.current = sessionId;
          }
        } catch (error) {
          console.error("Failed to parse pendingChatInput from localStorage:", error);
          localStorage.removeItem(sessionId);
        }
      }
    }
  }, [sessionId, doSubmit]); // doSubmit dependency is important here

  // onUserStop, onResend, onEditSubmit need to use setIsChatComponentBusy
  const onUserStop = useCallback(
    (messageId: string) => {
      ChatControllerPool.stop(sessionId, messageId);
    },
    [sessionId]
  );

  const onResend = useCallback(
    async (messageId: UUID) => {
      const resendingIndex = displayedMessages.findIndex((m) => m.id === messageId);
      if (resendingIndex <= 0) return;
      const messages = displayedMessages.slice(0, resendingIndex);
      setIsChatComponentBusy(true);
      await clearMessages(messageId);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewQuery(messages, {
            onReasoningStart: () => {},
            onReasoningChunk: (chunk: string) => {},
            onReasoningEnd: () => {},
            onContentChunk: (chunk: string) => {},
            onSuccess: () => { setIsChatComponentBusy(false); resolve(); },
            onFailure: (error: Error) => {
              console.error("[ChatComponent] Failed resend query", error);
              setIsChatComponentBusy(false); showSnackbar(Locale.Store.Error, "error"); reject(error);
            },
          });
        });
        setAutoScroll(true);
      } catch (error) { /* Handled */ }
    },
    [sessionId, displayedMessages, clearMessages, sendNewQuery, setAutoScroll, showSnackbar, setIsChatComponentBusy]
  );

  const onEditSubmit = useCallback(
    async (messageId: UUID, newText: string) => {
      const editIndex = displayedMessages.findIndex((m) => m.id === messageId);
      if (editIndex < 0) {
        console.error("[ChatComponent] Cannot find message to edit:", messageId);
        return;
      }
      clearMessages(messageId);
      setIsChatComponentBusy(true);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewUserMessage({ userInput: newText, persistedAttachedFiles: [], enableSearch: false }, {
            onReasoningStart: () => {},
            onReasoningChunk: (chunk: string) => {},
            onReasoningEnd: () => {},
            onContentChunk: (chunk: string) => {},
            onSuccess: () => { setIsChatComponentBusy(false); resolve(); },
            onFailure: (error: Error) => {
              console.error("[ChatComponent] Failed edit submission", error);
              setIsChatComponentBusy(false); showSnackbar(Locale.Store.Error, "error"); reject(error);
            },
          });
        });
        setAutoScroll(true);
        setTimeout(scrollDomToBottom, 0);
      } catch (error) { /* Handled */ }
    },
    [sessionId, showSnackbar, setAutoScroll, scrollDomToBottom, displayedMessages, clearMessages, sendNewUserMessage, setIsChatComponentBusy]
  );

  // Layout effect for scroll adjustment after loading more messages
  useLayoutEffect(() => {
    if (previousScrollHeightRef.current !== null && scrollRef.current && !isLoadingMessages) {
      const scrollHeightDiff = scrollRef.current.scrollHeight - previousScrollHeightRef.current;
      if (scrollHeightDiff > 0 && previousScrollTopRef.current !== null) { // Ensure height actually increased
        scrollRef.current.scrollTop = previousScrollTopRef.current + scrollHeightDiff;
      }
      previousScrollHeightRef.current = null; // Reset after adjustment
      previousScrollTopRef.current = null; // Reset after adjustment
    }
  }, [displayedMessages, isLoadingMessages]); // Triggered when messages or loading state change

  const isMessageAreaLoading = isLoadingMessages || isBotStreaming;

  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;
    const newIsHitBottom = scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    if (newIsHitBottom !== internalHitBottom) {
      setInternalHitBottom(newIsHitBottom); // This will trigger useEffect to update store
    }
    debouncedCheckEdges(scrollTop, scrollHeight, clientHeight);
  };
  
  const debouncedCheckEdges = useDebouncedCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      const edgeThreshold = 50;
      const isTouchTopEdge = scrollTop <= edgeThreshold;
      if (isTouchTopEdge && !isLoadingMessages) { 
        if (scrollRef.current) {
          previousScrollHeightRef.current = scrollRef.current.scrollHeight;
          previousScrollTopRef.current = scrollRef.current.scrollTop;
        }
        loadMoreMessages();
      }
    },
    200,
    { leading: false, trailing: true }
  );

  return (
    <div className={styles["chat-body-container"]}>
      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={onChatBodyScroll}
        onTouchStart={() => setAutoScroll(false)}
      >
        {displayedMessages.length > 10 && isLoadingMessages && hasMoreMessages && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <CircularProgress size={24} color="inherit" />
          </div>
        )}
        {displayedMessages.map((msgObject, i) => (
          <Fragment key={msgObject.id}>
            <ChatMessageCell
              sessionId={sessionId}
              messageId={msgObject.id}
              message={msgObject}
              index={i}
              isLoading={isMessageAreaLoading}
              showActions={true} 
              fontSize={fontSize}
              fontFamily={fontFamily}
              scrollRef={scrollRef}
              renderMessagesLength={displayedMessages.length}
              onResend={onResend}
              onUserStop={onUserStop}
              onEditSubmit={onEditSubmit}
            />
          </Fragment>
        ))}
      </div>
      {!internalHitBottom && (
        <div
          className={styles["scroll-to-bottom-chatview-wrapper"]}
          style={{ bottom: '20px' }}
        >
          <ActionButton
            onClick={internalScrollToBottom}
            text={null}
            icon={<ArrowDownwardRoundedIcon />}
            className={styles["scroll-to-bottom-chatview"]}
          />
        </div>
      )}
    </div>
  );
}

export const MemoizedChatComponent = React.memo(ChatComponent);
