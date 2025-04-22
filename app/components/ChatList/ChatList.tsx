"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";

import { useChatStore } from "@/app/store/chat";
import { useChatActions } from "@/app/hooks/useChatActions";
import type { ChatSession } from "@/app/types/session"; // Adjusted path
import Locale from "@/app/locales"; // Adjusted path
import { ChatItem } from "./ChatItem"; // Import from the same directory
import { ChatListSkeleton } from "./ChatListSkeleton"; // Import the skeleton component
import styles from "./chat-list.module.scss";
import { useApiClient } from "@/app/context/ApiProviderContext";

// Assuming showConfirm is replaced by window.confirm or similar
// import { showConfirm } from "../components/ui-lib"; // Adjusted/removed path

interface ChatListProps {
  narrow?: boolean;
}

export function ChatList(props: ChatListProps) {
  const {
    sessions,
    currentSessionIndex,
    // selectSession,
    moveSession,
    // deleteSession,
    updateTargetSession,
  } = useChatStore();

  const { 
    deleteSession,
    selectSession,
    // moveSession: moveSessionAction,
    // updateTargetSession: updateTargetSessionAction,
  } = useChatActions();

  const router = useRouter();
  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Effect to determine loading state based on sessions
  useEffect(() => {
    // Consider loaded if there's more than 1 session OR the only session is not empty (has messages)
    // const isActuallyEmpty = sessions.length === 1 && sessions[0].messages.length === 0 && sessions[0].topic === Locale.Store.DefaultTopic; 
    if (sessions.length > 0) { // } && !isActuallyEmpty) {
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
            const stillDefaultEmpty = sessions.length === 1 && sessions[0].messages.length === 0 && sessions[0].topic === Locale.Store.DefaultTopic;
            if (stillDefaultEmpty) {
                setIsLoading(false);
            }
        }, 500); // Longer timeout for initial load check
         return () => clearTimeout(timer);
    }
  }, [sessions]); // Re-run when sessions array reference changes

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveSession(source.index, destination.index);
  };

  const handleSelectItem = (session: ChatSession) => {
    router.push(`/chat/${session.id}`);
    // Find the index of the selected session if needed (though selectSession uses index)
    // const index = sessions.findIndex((s) => s.id === session.id);
    // selectSession(index); // selectSession expects index, which we already have from mapping
  };

  const handleDeleteItem = async (session: ChatSession, index: number) => {
    // Replace showConfirm with window.confirm or a project-specific modal
    if (window.confirm(Locale.Home.DeleteChat)) {
      const isCurrentSession = index === currentSessionIndex;
      deleteSession(index, apiClient);
      
      // Navigate to /chat if the deleted session was the current one
      // or if it was the last session available
      if (isCurrentSession || sessions.length === 1) { // sessions.length reflects state BEFORE deletion
        router.push('/chat');
      }
      // No else needed: if a different session was deleted, stay on the current chat page.
    }
  };

  const handleRenameItem = (session: ChatSession, newName: string) => {
    if (newName && newName.trim() !== "") {
      updateTargetSession(session, (s) => {
        s.topic = newName.trim();
      });
    }
  };

  // Render Skeleton if loading
  if (isLoading) {
    return <ChatListSkeleton />;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="chat-list">
        {(provided) => (
          <div
            className={styles["chat-list"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {sessions.map((item, i) => (
              <ChatItem
                session={item} // Pass the full session object
                key={item.id}
                index={i}
                selected={i === currentSessionIndex}
                onClick={() => {
                  handleSelectItem(item);
                  selectSession(i);
                }}
                onDelete={() => handleDeleteItem(item, i)}
                onRename={(newTitle) => handleRenameItem(item, newTitle)}
                narrow={props.narrow}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
} 