"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { useAppConfig } from "@/store";
import Locale from "@/locales";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useSnackbar } from "@/providers/snackbar-provider";
import { ChatMessageCell } from "@/components/chat/chat-message-cell";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "./chat.module.scss";
import { ActionButton } from "@/components/ui/action-button";
import { UUID } from "crypto";
import { SessionState } from "@/types/session";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useChatList, useChat } from "@/sdk/hooks";
import { Chat } from "@/sdk/Chat";
import { useChatStore } from "@/store";

export function ChatComponent({ sessionId }: { sessionId: UUID }) {
  const config = useAppConfig();
  const { showSnackbar } = useSnackbar();
  const sdk = usePandaSDK();
  const chatStore = useChatStore();

  const { activeChat } = useChatList();
  console.log(`[ChatComponent] Active chat: ${activeChat?.id}`);
  const { messages: displayedMessages, isLoading: isLoadingMessages, hasMoreMessages } = useChat(activeChat);
  console.log(`[ChatComponent] Displayed messages: ${displayedMessages.length}`);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [internalHitBottom, setInternalHitBottom] = useState(true);

  // When the component mounts or sessionId changes, ensure the correct chat is active.
  // useEffect(() => {
  //   // If there is no active chat or the active chat is not the one for this page, set it.
  //   if (activeChat?.id !== sessionId) {
  //       const session = chatStore.sessions.find(s => s.id === sessionId);
  //       if(session) {
  //           sdk.chat.setActiveChat(sessionId);
  //       } else {
  //           // This might happen if the session list hasn't loaded yet.
  //           // The component will re-render once the session list is available.
  //           console.log("Waiting for session info to set active chat...");
  //       }
  //   }
  // }, [sessionId, activeChat, chatStore.sessions, sdk.chat]);
  
  // When the active chat changes and has no messages, load them.
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0) {
      console.log(`[ChatComponent] Loading initial messages for chat ${activeChat.id}`);
      activeChat.loadInitial();
    }
  }, [activeChat]);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(scrollRef, !internalHitBottom, displayedMessages);

  const doSubmit = useCallback(async (sessionState: SessionState) => {
    if (!activeChat) return;
    
    // The sendMessage options are now simpler as the config is on the Chat object
    await activeChat.sendMessage(sessionState.userInput, config.modelConfig, {
        attachments: sessionState.persistedAttachedFiles as any,
        enableSearch: sessionState.enableSearch,
        onSuccess: () => {},
        onFailure: (error: Error) => {
            console.error("[ChatComponent] Failed user input", error);
            showSnackbar(Locale.Store.Error, "error");
        },
    });
    setAutoScroll(true);
  }, [activeChat, setAutoScroll, showSnackbar]);

  // Register/unregister submit handler with the store
  // useEffect(() => {
  //   chatStore.setOnSendMessageHandler(doSubmit);
  //   return () => {
  //     chatStore.setOnSendMessageHandler(null);
  //   };
  // }, [chatStore, doSubmit]);

  const onResend = useCallback(async (messageId: UUID) => {
    if (!activeChat) return;
    // This logic needs to be moved into the Chat class as `resendFrom(messageId)`
    console.log("Resend logic needs to be implemented in Chat.ts");
  }, [activeChat]);

  const onEditSubmit = useCallback(async (messageId: UUID, newText: string) => {
    if (!activeChat) return;
    // This logic needs to be moved into the Chat class as `editMessage(messageId, newText)`
    console.log("Edit logic needs to be implemented in Chat.ts");
  }, [activeChat]);
  
  const loadMore = useCallback(() => {
    if (activeChat) {
      activeChat.loadMoreMessages();
    }
  }, [activeChat]);

  // ... (scroll handling logic can remain mostly the same, but call `loadMore`)
  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;
    const newIsHitBottom = scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    if (newIsHitBottom !== internalHitBottom) {
      setInternalHitBottom(newIsHitBottom);
    }
    debouncedCheckEdges(scrollTop);
  };

  const debouncedCheckEdges = useDebouncedCallback((scrollTop: number) => {
    const edgeThreshold = 50;
    if (scrollTop <= edgeThreshold && !isLoadingMessages && hasMoreMessages) {
      loadMore();
    }
  }, 200, { leading: false, trailing: true });

  console.log(`[ChatComponent] Rendering messages: ${displayedMessages.length} ${displayedMessages.map(m => m.role)}`);
  return (
    <div className={styles["chat-body-container"]}>
      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={onChatBodyScroll}
        onTouchStart={() => setAutoScroll(false)}
      >
        {isLoadingMessages && hasMoreMessages && (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
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
              isLoading={isLoadingMessages}
              showActions={true}
              fontSize={config.fontSize}
              fontFamily={config.fontFamily}
              scrollRef={scrollRef}
              renderMessagesLength={displayedMessages.length}
              onResend={onResend}
              onEditSubmit={onEditSubmit}
            />
          </Fragment>
        ))}
      </div>
      {!internalHitBottom && (
        <div className={styles["scroll-to-bottom-chatview-wrapper"]} style={{ bottom: "20px" }}>
          <ActionButton onClick={scrollDomToBottom} text={null} icon={<ArrowDownwardRoundedIcon />} className={styles["scroll-to-bottom-chatview"]} />
        </div>
      )}
    </div>
  );
}
