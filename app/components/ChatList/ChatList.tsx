"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import { useChatStore } from "@/app/store/chat";
import { useChatActions } from "@/app/hooks/useChatActions";
import type { ChatSession } from "@/app/types/session"; 
import Locale from "@/app/locales"; 
import { ChatItem } from "./ChatItem";
import { ChatListSkeleton } from "./ChatListSkeleton";
import styles from "./chat-list.module.scss";

interface ChatListProps {
  narrow?: boolean;
}

export function ChatList(props: ChatListProps) {
  const {
    sessions,
    currentSessionIndex,
  } = useChatStore();

  const { deleteSession, selectSession, updateConversation } = useChatActions();

  const router = useRouter();
  const store = useChatStore();
  // const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Effect to determine loading state based on sessions
  useEffect(() => {
    // Consider loaded if there's more than 1 session OR the only session is not empty (has messages)
    // const isActuallyEmpty = sessions.length === 1 && sessions[0].messages.length === 0 && sessions[0].topic === Locale.Store.DefaultTopic;
    if (sessions.length > 0) {
      // } && !isActuallyEmpty) {
      // Set a short delay to allow persistence hydration to potentially finish
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100); // Adjust timeout as needed
      return () => clearTimeout(timer);
    } else if (sessions.length === 0) {
      // If somehow sessions array becomes totally empty, treat as loading? Or handle as error?
      // For now, keep loading true if empty
      setIsLoading(true);
    } else {
      // If it's just the default empty session, keep loading for a bit longer
      // to see if persisted sessions load
      const timer = setTimeout(() => {
        // Re-check after timeout. If still the default empty session, assume loading finished (user has no sessions).
        const stillDefaultEmpty =
          sessions.length === 1 &&
          sessions[0].messages.length === 0 &&
          sessions[0].topic === Locale.Store.DefaultTopic;
        if (stillDefaultEmpty) {
          setIsLoading(false);
        }
      }, 500); // Longer timeout for initial load check
      return () => clearTimeout(timer);
    }
  }, [sessions]); // Re-run when sessions array reference changes

  const handleSelectItem = (session: ChatSession) => {
    // Navigation triggers useParams update, which triggers Effect 1 to update highlight
    // const store = useChatStore();
    const sessionIndexToSelect = sessions.findIndex((s) => s.id === session.id);
    store.setCurrentSessionIndex(sessionIndexToSelect);

    // t(() => {
    //   const currentChatIdInStore = useChatStore.getState().currentSession()?.id;
    //   console.log(`[ChatPage Effect 2] Running. isValidSession: ${isValidSession}, chatId: ${chatId}, currentChatIdInStore: ${currentChatIdInStore}`);

    //   if (isValidSession && chatId && chatId !== currentChatIdInStore) {
    //     const sessions = useChatStore.getState().sessions; // Get fresh sessions
    //     const sessionIndexToSelect = sessions.findIndex(s => s.id === chatId);
    //     if (sessionIndexToSelect !== -1) {
    //       console.log(`[ChatPage Effect 2] Selecting session ${chatId} at index ${sessionIndexToSelect}`);
    //       selectSession(sessionIndexToSelect);
    //     } else {
    //       // This case should ideally be caught by Effect 1 setting isValidSession to false
    //       console.warn(`[ChatPage Effect 2] Valid session ${chatId} suddenly not found for selection. This might indicate a race condition or rapid store update.`);
    //       setIsValidSession(false); // Corrective action: mark as invalid if not found during selection attempt
    //     }
    //   }
    // }, [isValidSession, chatId, selectSession]); // Depends on validity, chatId, and the stable selectSession action
    router.replace(`/chat/${session.id}`);
  };

  const handleDeleteItem = async (session: ChatSession, index: number) => {
    // Replace showConfirm with window.confirm or a project-specific modal
    if (window.confirm(Locale.Home.DeleteChat)) {
      const isCurrentSession = index === currentSessionIndex;
      deleteSession(index);

      // Navigate to /chat if the deleted session was the current one
      // or if it was the last session available
      if (isCurrentSession || sessions.length === 1) {
        // sessions.length reflects state BEFORE deletion
        router.push("/chat");
      }
      // No else needed: if a different session was deleted, stay on the current chat page.
    }
  };

  const handleRenameItem = (session: ChatSession, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName && session.id) {
      // Ensure session.id exists
      updateConversation(session.id, { title: trimmedName });
    } else if (trimmedName && session.id) {
      // Fallback: If purely server-side session without local ID yet (less likely)
      // console.warn("[ChatList] Renaming session using conversationId as fallback");
      updateConversation(session.id, { title: trimmedName });
    } else {
      console.error("[ChatList] Cannot rename session - missing identifier");
    }
  };

  if (isLoading) {
    return <ChatListSkeleton />;
  }

  return (
    // Removed DragDropContext and Droppable wrappers
    <div className={styles["chat-list"]}>
      {sessions.map((item, i) => (
        <ChatItem
          session={item}
          key={item.id} // Use local ID as key
          index={i}
          selected={i === currentSessionIndex} // Highlight directly based on URL chatId
          onClick={() => {
            selectSession(i);
            handleSelectItem(item);
          }}
          onDelete={() => handleDeleteItem(item, i)}
          onRename={(newTitle) => handleRenameItem(item, newTitle)}
          narrow={props.narrow}
        />
      ))}
    </div>
  );
}
