"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import Locale from "@/locales";
import { ChatItem } from "./chat-item";
import { ChatListSkeleton } from "./chat-list-skeleton";
import styles from "./chat-list.module.scss";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useChatList } from "@/sdk/hooks";
import { Conversation } from "@/client/types";
import { useChatStore } from "@/store";
import { Chat } from "@/sdk/Chat";

interface ChatListProps {
  narrow?: boolean;
}

// All grouping and sorting logic remains the same
const getRelativeDateGroup = (dateInput: number): string => {
  const now = new Date();
  const then = new Date(dateInput);
  const diffTime = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (now.toDateString() === then.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === then.toDateString()) return "Yesterday";
  if (diffDays < 7) return "Previous 7 Days";
  if (diffDays < 30) return "Previous 30 Days";
  if (now.getFullYear() === then.getFullYear()) {
    return then.toLocaleString("default", { month: "long" });
  }
  return then.getFullYear().toString();
};

const groupOrder = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days"];

const getMonthYearSortKey = (groupName: string, currentYear: number): string => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (months.includes(groupName)) {
    return `${currentYear}-${(months.indexOf(groupName) + 1).toString().padStart(2, "0")}`;
  }
  if (/^\d{4}$/.test(groupName)) {
    return groupName;
  }
  return groupName;
};

export function ChatList(props: ChatListProps) {
  const router = useRouter();
  const sdk = usePandaSDK();
  const chatManager = sdk.chat;
  const chatStore = useChatStore();

  const { conversations, isLoading, hasMore, activeChat } = useChatList();
  
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (conversations.length === 0 && hasMore && !isLoading) {
      chatManager.loadChats();
    }
  }, [conversations.length, hasMore, isLoading, chatManager]);
  
  useEffect(() => {
    const currentObserverRef = observerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          chatManager.loadChats();
        }
      },
      { threshold: 1.0 },
    );

    if (currentObserverRef) observer.observe(currentObserverRef);
    return () => {
      if (currentObserverRef) observer.unobserve(currentObserverRef);
    };
  }, [hasMore, isLoading, chatManager]);

  const handleSelectItem = async (conversation: Chat) => {
    try {
      const session = await chatManager.getChat(conversation.id);
      if(session) {
        chatManager.setActiveChat(conversation.id);
        router.replace(`/chat/${conversation.id}`);
      } else {
          console.error("Session config not found for conversation:", conversation.id);
      }
    } catch (error) {
      console.error("Error selecting chat item:", error);
    }
  };

  const handleDeleteItem = async (conversation: Chat) => {
    if (window.confirm(Locale.Home.DeleteChat)) {
      const wasActive = activeChat?.id === conversation.id;
      await chatManager.deleteChat(conversation.id);
      if (wasActive) {
        router.push("/");
      }
    }
  };
  
  const handleRenameItem = (conversation: Chat, newName: string) => {
    chatManager.renameChat(conversation.id, newName);
  };

  const groupedSessions = conversations.reduce<{[groupName: string]: Chat[]}>((acc, session) => {
      const dateToGroup = new Date(session.updatedAt ?? 0).getTime();
      const groupName = getRelativeDateGroup(dateToGroup);
      if (!acc[groupName]) acc[groupName] = []; 
      acc[groupName].push(session);
      return acc;
    }, {});

  const currentYear = new Date().getFullYear();
  const sortedGroupNames = Object.keys(groupedSessions).sort((a, b) => {
    const aIsPredefined = groupOrder.includes(a);
    const bIsPredefined = groupOrder.includes(b);

    if (aIsPredefined && bIsPredefined) return groupOrder.indexOf(a) - groupOrder.indexOf(b);
    if (aIsPredefined) return -1;
    if (bIsPredefined) return 1;

    const sortKeyA = getMonthYearSortKey(a, currentYear);
    const sortKeyB = getMonthYearSortKey(b, currentYear);

    if (sortKeyA > sortKeyB) return -1;
    if (sortKeyA < sortKeyB) return 1;
    return 0;
  });

  if (isLoading && conversations.length === 0) {
    return <ChatListSkeleton targetHeight={500} />;
  }

  return (
    <div className={styles["chat-list"]}>
      {sortedGroupNames.map((groupName) => (
        <div key={groupName} className={styles["chat-date-group"]}>
          <div className={styles["chat-date-header"]}>{groupName}</div>
          {groupedSessions[groupName]
            .map((item, i) => (
              <ChatItem
                session={item as any}
                key={item.id}
                index={i}
                selected={item.id === activeChat?.id}
                onClick={() => handleSelectItem(item)}
                onDelete={() => handleDeleteItem(item)}
                onRename={(newTitle) => handleRenameItem(item, newTitle)}
                narrow={props.narrow}
              />
            ))}
        </div>
      ))}
      {hasMore && (
        <div ref={observerRef} style={{ height: "1px", marginTop: "-1px" }} />
      )}
      {isLoading && conversations.length > 0 && (
        <ChatListSkeleton targetHeight={100} />
      )}
      {!isLoading && conversations.length === 0 && !hasMore && (
          <div className={styles["chat-date-header"]}>
            {"No conversations found"}
          </div>
      )}
    </div>
  );
}
