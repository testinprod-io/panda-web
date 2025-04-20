"use client";

import React from "react";
import {
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";

import { useChatStore } from "@/app/store/chat";
import type { ChatSession } from "@/app/types/session"; // Adjusted path
import Locale from "@/app/locales"; // Adjusted path
import { ChatItem } from "./ChatItem"; // Import from the same directory
import styles from "./chat-list.module.scss";

// Assuming showConfirm is replaced by window.confirm or similar
// import { showConfirm } from "../components/ui-lib"; // Adjusted/removed path

interface ChatListProps {
  narrow?: boolean;
}

export function ChatList(props: ChatListProps) {
  const {
    sessions,
    currentSessionIndex,
    selectSession,
    moveSession,
    deleteSession,
    updateTargetSession,
  } = useChatStore();

  const router = useRouter();

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
      deleteSession(index);
      
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
                  selectSession(i);
                  handleSelectItem(item);
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