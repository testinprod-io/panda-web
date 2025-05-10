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
import { useChatActions } from "@/app/hooks/useChatActions";

// Corrected ChatComponentProps interface
// Ensure this interface is exported
export interface ChatComponentProps {
  sessionId: UUID;
  setIsLoadingLayout: (isLoading: boolean) => void; 
  
  exportSubmitHandler: (handler: (input: string, images: string[]) => Promise<void>) => void;
  onHitBottomChange: (isAtBottom: boolean) => void; 
  exportScrollToBottomFunc: (func: () => void) => void;
}

export function ChatComponent(props: ChatComponentProps) {
  const {
    sessionId,
    setIsLoadingLayout,
    exportSubmitHandler,
    onHitBottomChange,
    exportScrollToBottomFunc,
  } = props;

  console.log("[ChatComponent] Rendering. Session ID:", sessionId);

  const chatStore = useChatStore();
  const config = useAppConfig();
  const { showSnackbar } = useSnackbar();

  const initialMessageProcessedRef = useRef<string | null>(null);

  const { isLoading: isDecryptingMessage } = useDecryptionManager();

  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hitBottom, setHitBottom] = useState(true);

  const { 
    displayedMessages, 
    isLoading: isLoadingMessages, 
    hasMoreMessages, 
    loadMoreMessages, 
    clearMessages, 
    sendNewUserMessage, 
    sendNewQuery,
    finalizeStreamedBotMessage,
    markMessageAsError,
  } = useChatSessionManager(sessionId, config.modelConfig);

  const { generateSessionTitle } = useChatActions();

  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const isBotStreaming = !!(lastMessage?.role === "assistant" && lastMessage.streaming);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !hitBottom,
    displayedMessages as any
  );

  const doSubmit = useCallback(
    async (input: string, images: string[]) => {
      setIsLoadingLayout(true);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewUserMessage(input, images, {
            onStart: () => {},
            onStreaming: (partialMessage: string) => {},
            onSuccess: () => {
              setIsLoadingLayout(false);
              resolve();
            },
            onFailure: (error: Error) => {
              console.error("[Chat] Failed user input", error);
              setIsLoadingLayout(false);
              showSnackbar(Locale.Store.Error, "error");
              reject(error);
            },
          });
        });
        setAutoScroll(true);
      } catch (error) {
      }
    },
    [sessionId, displayedMessages, generateSessionTitle, sendNewUserMessage, setAutoScroll, showSnackbar, setIsLoadingLayout]
  );

  useEffect(() => {
    if (exportSubmitHandler) {
      exportSubmitHandler(doSubmit);
    }
  }, [exportSubmitHandler, doSubmit]);

  const internalScrollToBottom = useCallback(() => {
    scrollDomToBottom();
  }, [scrollDomToBottom]);

  useEffect(() => {
    if (exportScrollToBottomFunc) {
      exportScrollToBottomFunc(internalScrollToBottom);
    }
  }, [exportScrollToBottomFunc, internalScrollToBottom]);

  useEffect(() => {
    if (onHitBottomChange) {
      onHitBottomChange(hitBottom);
    }
  }, [hitBottom, onHitBottomChange]);

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
      setIsLoadingLayout(true);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewQuery(messages, {
            onStart: () => {},
            onStreaming: (partialMessage: string) => {},
            onSuccess: () => { setIsLoadingLayout(false); resolve(); },
            onFailure: (error: Error) => {
              console.error("[Chat] Failed resend query", error);
              setIsLoadingLayout(false);
              showSnackbar(Locale.Store.Error, "error");
              reject(error);
            },
          });
        });
        setAutoScroll(true);
      } catch (error) {
      }
    },
    [sessionId, displayedMessages, clearMessages, sendNewQuery, setAutoScroll, showSnackbar, setIsLoadingLayout]
  );

  const onEditSubmit = useCallback(
    async (messageId: UUID, newText: string) => {
      setIsLoadingLayout(true);
      const editIndex = displayedMessages.findIndex((m) => m.id === messageId);
      if (editIndex < 0) {
        console.error("[Chat] Cannot find message to edit:", messageId);
        setIsLoadingLayout(false);
        return;
      }
      clearMessages(messageId);
      try {
        await new Promise<void>((resolve, reject) => {
          sendNewUserMessage(newText, [], {
            onStart: () => {},
            onStreaming: () => {},
            onSuccess: () => { setIsLoadingLayout(false); resolve(); },
            onFailure: (error: Error) => {
              console.error("[Chat] Failed edit submission", error);
              setIsLoadingLayout(false);
              showSnackbar(Locale.Store.Error, "error");
              reject(error);
            },
          });
        });
        setAutoScroll(true);
        setTimeout(scrollDomToBottom, 0);
      } catch (error) {
      }
    },
    [sessionId, showSnackbar, setAutoScroll, scrollDomToBottom, displayedMessages, clearMessages, sendNewUserMessage, setIsLoadingLayout]
  );

  const renderMessages = useMemo(() => {
    return displayedMessages;
  }, [displayedMessages]);

  const messagesToRender = useMemo(() => {
    return renderMessages;
  }, [renderMessages]);

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

  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;
    const newIsHitBottom = scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    if (newIsHitBottom !== hitBottom) {
      setHitBottom(newIsHitBottom);
    }
    debouncedCheckEdges(scrollTop, scrollHeight, clientHeight);
  };

  useEffect(() => {
    if (sessionId && initialMessageProcessedRef.current !== sessionId) {
      const storedDataString = localStorage.getItem(sessionId);
      if (storedDataString) {
        try {
          const parsedData = JSON.parse(storedDataString);
          if (parsedData) {
            doSubmit(parsedData.input, parsedData.images);
            localStorage.removeItem(sessionId);
            initialMessageProcessedRef.current = sessionId;
          }
        } catch (error) {
          console.error("Failed to parse pendingChatInput from localStorage:", error);
          localStorage.removeItem(sessionId);
        }
      }
    }
  }, [sessionId, doSubmit]);

  useLayoutEffect(() => {
    if (sessionId && !isLoadingMessages) {
      scrollDomToBottom();
    }
  }, [sessionId, isLoadingMessages, scrollDomToBottom]);

  const isMessageAreaLoading = isLoadingMessages || isBotStreaming;

  return (
    <div className={styles["chat-body-container"]}>
      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={onChatBodyScroll}
        onTouchStart={() => {
          setAutoScroll(false);
        }}
      >
        {messagesToRender.map((encryptedMsg, i) => {
          const globalMessageIndex = i;
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
          );
        })}
      </div>

      {!hitBottom && (
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
