import React from 'react';
import clsx from 'clsx';
import { Role } from '@/types'; // Assuming MessageRole is defined here
import styles from './chat.module.scss'; // Reuse existing chat styles if applicable

interface ChatMessageCellSkeletonProps {
  role: Role;
}

/**
 * A skeleton placeholder component for a chat message cell.
 * Mimics the basic layout and alignment based on the role.
 */
export const ChatMessageCellSkeleton: React.FC<ChatMessageCellSkeletonProps> = ({ role }) => {
  // console.log('[ChatMessageCellSkeleton] Rendering skeleton for role:', role);
  
  const isUser = role === Role.USER;

  return (
    <div
      className={clsx(
        styles["chat-message"],
        isUser ? styles["chat-message-user"] : null,
        styles["chat-message-skeleton"]
      )}
    >
      <div className={styles["chat-message-container"]}>
        <div className={styles["chat-message-item-skeleton"]}>
          <div className={styles["skeleton-line"]} style={{ width: '80%' }}></div>
          <div className={styles["skeleton-line"]} style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};

// Add some basic skeleton styles to chat.module.scss if they don't exist:
/*
.chat-message-skeleton {
  opacity: 0.7;
}

.chat-message-item-skeleton {
  background-color: #e0e0e0; // Placeholder background
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 50px; // Ensure some height
  display: flex;
  flex-direction: column;
  gap: 8px; // Space between lines
}

.skeleton-line {
  background-color: #c0c0c0; // Darker placeholder line
  height: 10px;
  border-radius: 4px;
}
*/ 