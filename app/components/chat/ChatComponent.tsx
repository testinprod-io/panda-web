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

import { useAppConfig, useChatStore } from "@/app/store"; // Adjust path
import {
  EncryptedMessage
} from "@/app/types";

import { ChatControllerPool } from "@/app/client/controller";

import Locale from "@/app/locales"; // Adjust path
import { useScrollToBottom } from "@/app/hooks/useScrollToBottom"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook

import { ChatMessageCell } from "@/app/components/chat/ChatMessageCell"; // Import the new cell component

import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";

import styles from "./chat.module.scss";
import { ChatAction } from "./ChatAction"; // Import ChatAction
import { useDecryptionManager } from "@/app/hooks/useDecryptionManager"; // <-- Import the hook
import { useChatSessionManager } from "@/app/hooks/useChatSessionManager";
import { UUID } from "crypto";
import { useChatActions } from "@/app/hooks/useChatActions";

// ChatComponentProps is now simpler as it gets most things from the store or direct sessionID
export interface ChatComponentProps {
  sessionId: UUID;
  // Edit/Confirm modals are usually triggered from ChatMessageCell actions or context menus,
  // so Chat.tsx might still handle their state and ChatComponent might receive functions to trigger them.
  onShowEditMessageModal?: (message: EncryptedMessage) => void;
  onShowConfirmDialog?: (title: string, content: string, onConfirm: () => void) => void;
}

export function ChatComponent(props: ChatComponentProps) {
  const { 
    sessionId, 
    onShowEditMessageModal,
    onShowConfirmDialog 
  } = props;

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
  // DecryptionManager and other hooks remain
  const { isLoading: isDecryptingMessage } = useDecryptionManager();
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [internalHitBottom, setInternalHitBottom] = useState(true); // Local state for UI button

  const { 
    displayedMessages, 
    isLoading: isLoadingMessages, 
    hasMoreMessages, 
    loadMoreMessages, 
    clearMessages, 
    sendNewUserMessage, 
    sendNewQuery,
    // finalizeStreamedBotMessage, // Ensure this is used or removed if not
    // markMessageAsError, // Ensure this is used or removed if not
  } = useChatSessionManager(sessionId, config.modelConfig);
  
  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const isBotStreaming = !!(lastMessage?.role === "system" && lastMessage.streaming);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !internalHitBottom,
    displayedMessages as any
  );

  // Update store with hitBottom state
  useEffect(() => {
    setHitBottom(internalHitBottom);
  }, [internalHitBottom, setHitBottom]);

  const doSubmit = useCallback(
    async (input: string, files: {url: string, type: string, name: string}[]) => {
      setIsChatComponentBusy(true);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewUserMessage(input, files, {
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
      } catch (error) {
        // Error already handled by onFailure, isChatComponentBusy set to false there
      }
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
          const parsedData = JSON.parse(storedDataString);
          if (parsedData) {
            // doSubmit will set isChatComponentBusy
            doSubmit(parsedData.input, parsedData.files);
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
      clearMessages(messageId);
      setIsChatComponentBusy(true);
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
          sendNewUserMessage(newText, [], {
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

  // Layout effect for initial scroll
  useLayoutEffect(() => {
    if (sessionId && !isLoadingMessages) { 
      scrollDomToBottom();
    }
  }, [sessionId, isLoadingMessages, scrollDomToBottom]);

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
  
  const renderMessages = useMemo(() => displayedMessages, [displayedMessages]);
  const messagesToRender = useMemo(() => renderMessages, [renderMessages]);

  const debouncedCheckEdges = useDebouncedCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      const edgeThreshold = 50;
      const isTouchTopEdge = scrollTop <= edgeThreshold;
      if (isTouchTopEdge && !isLoadingMessages) { 
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
        {messagesToRender.map((msgObject, i) => (
          <Fragment key={msgObject.id}>
            <ChatMessageCell
              messageId={msgObject.id}
              message={msgObject}
              index={i}
              isLoading={isMessageAreaLoading}
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
        ))}
      </div>
      {!internalHitBottom && (
        <div
          className={styles["scroll-to-bottom-chatview-wrapper"]}
          style={{ bottom: '20px' }}
        >
          <ChatAction
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
