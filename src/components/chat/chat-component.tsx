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
import { ModelConfig } from "@/types/constant";

export function ChatComponent({ sessionId }: { sessionId: UUID }) {
  const config = useAppConfig();
  const { showSnackbar } = useSnackbar();
  const sdk = usePandaSDK();
  const chatStore = useChatStore();

  const { activeChat } = useChatList();
  const { messages: displayedMessages, isLoading: isLoadingMessages, hasMoreMessages } = useChat(activeChat);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [internalHitBottom, setInternalHitBottom] = useState(true);

  // When the component mounts or sessionId changes, ensure the correct chat is active.
  useEffect(() => {
    // If there is no active chat or the active chat is not the one for this page, set it.
    if (activeChat?.id !== sessionId) {
        const session = chatStore.sessions.find(s => s.id === sessionId);
        if(session) {
            try {
              sdk.chat.setActiveChat(sessionId);
              // Update the chat's model config if needed
              if (activeChat && session.modelConfig) {
                activeChat.updateModelConfig(session.modelConfig);
              }
              if (activeChat && session.customizedPrompts) {
                // Handle both string and object types for customizedPrompts
                const prompts = typeof session.customizedPrompts === 'string' 
                  ? JSON.parse(session.customizedPrompts) 
                  : session.customizedPrompts;
                activeChat.updateCustomizedPrompts(prompts);
              }
            } catch (error) {
              console.error("Failed to set active chat:", error);
            }
        } else {
            // This might happen if the session list hasn't loaded yet.
            // The component will re-render once the session list is available.
            console.log("Waiting for session info to set active chat...");
        }
    }
  }, [sessionId, activeChat, chatStore.sessions, sdk.chat]);
  
  // When the active chat changes and has no messages, load them.
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0) {
      activeChat.loadInitial().catch(error => {
        console.error("Failed to load initial messages:", error);
        showSnackbar("Failed to load messages", "error");
      });
    }
  }, [activeChat, showSnackbar]);

  const { scrollDomToBottom, setAutoScroll } = useScrollToBottom(scrollRef, !internalHitBottom, displayedMessages);

  const doSubmit = useCallback(async (sessionState: SessionState) => {
    if (!activeChat) {
      console.error("No active chat for submitting message");
      return;
    }
    
    // Get model config from the active chat or use a default
    const modelConfig = activeChat.modelConfig || config.modelConfig;
    if (!modelConfig) {
      console.error("No model config available");
      showSnackbar("Configuration error", "error");
      return;
    }
    
    try {
      await activeChat.sendMessage(sessionState.userInput, modelConfig, {
          attachments: sessionState.persistedAttachedFiles as any,
          enableSearch: sessionState.enableSearch,
          onSuccess: () => {
            setAutoScroll(true);
          },
          onFailure: (error: Error) => {
              console.error("[ChatComponent] Failed user input", error);
              showSnackbar(Locale.Store.Error, "error");
          },
      });
    } catch (error) {
      console.error("[ChatComponent] Error sending message:", error);
      showSnackbar("Failed to send message", "error");
    }
  }, [activeChat, config.modelConfig, setAutoScroll, showSnackbar]);

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
    if (activeChat && hasMoreMessages && !isLoadingMessages) {
      activeChat.loadMoreMessages().catch(error => {
        console.error("Failed to load more messages:", error);
        showSnackbar("Failed to load more messages", "error");
      });
    }
  }, [activeChat, hasMoreMessages, isLoadingMessages, showSnackbar]);

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
