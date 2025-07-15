"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { useAppConfig } from "@/store";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useSnackbar } from "@/providers/snackbar-provider";
import { ChatMessageCell } from "@/components/chat/chat-message-cell";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "./chat.module.scss";
import { ActionButton } from "@/components/ui/action-button";
import { UUID } from "crypto";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useChatList, useChat } from "@/sdk/hooks";
import { Chat } from "@/sdk/Chat";

export function ChatComponent({ sessionId }: { sessionId: UUID }) {
  const config = useAppConfig();
  const { sdk } = usePandaSDK();

  const { activeChatId } = useChatList();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const {
    messages: displayedMessages,
    isLoading: isLoadingMessages,
    hasMoreMessages,
  } = useChat(activeChat);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [internalHitBottom, setInternalHitBottom] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      const chat = await sdk.chat.getChat(activeChatId as UUID);
      if (chat) {
        setActiveChat(chat);
      }
    };
    loadChat();
  }, [activeChatId, sdk.chat]);
  
  useEffect(() => {
    if (
      activeChat &&
      activeChat.id === sessionId &&
      activeChat.messages.length === 0
    ) {
      console.log(
        `[ChatComponent] Loading initial messages for chat ${activeChat.id}`
      );
      activeChat.loadInitial();
    }
  }, [activeChat, sessionId]);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(
    scrollRef,
    !internalHitBottom,
    displayedMessages
  );

  const onResend = useCallback(
    async (messageId: UUID) => {
      if (!activeChat) return;
      activeChat.resendMessage(messageId);
    },
    [activeChat]
  );

  const onEditSubmit = useCallback(
    async (messageId: UUID, newText: string) => {
      // TODO: Implement edit message
    },
    [activeChat]
  );

  const loadMore = useCallback(() => {
    if (activeChat) {
      activeChat.loadMoreMessages();
    }
  }, [activeChat]);

  const onChatBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const bottomHeight = scrollTop + clientHeight;
    const newIsHitBottom =
      scrollHeight > 0 && bottomHeight >= scrollHeight - 10;
    if (newIsHitBottom !== internalHitBottom) {
      setInternalHitBottom(newIsHitBottom);
    }
    debouncedCheckEdges(scrollTop);
  };

  const debouncedCheckEdges = useDebouncedCallback(
    (scrollTop: number) => {
      const edgeThreshold = 50;
      if (scrollTop <= edgeThreshold && !isLoadingMessages && hasMoreMessages) {
        loadMore();
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
        {isLoadingMessages && hasMoreMessages && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "20px 0",
            }}
          >
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
        <div
          className={styles["scroll-to-bottom-chatview-wrapper"]}
          style={{ bottom: "20px" }}
        >
          <ActionButton
            onClick={scrollDomToBottom}
            text={null}
            icon={<ArrowDownwardRoundedIcon />}
            className={styles["scroll-to-bottom-chatview"]}
          />
        </div>
      )}
    </div>
  );
}
