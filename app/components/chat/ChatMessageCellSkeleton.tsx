import React from 'react';
import clsx from 'clsx';
import { MessageRole } from '@/app/types'; // Assuming MessageRole is defined here
import styles from './chat.module.scss'; // Reuse existing chat styles if applicable

interface ChatMessageCellSkeletonProps {
  role: MessageRole;
}

/**
 * A skeleton placeholder component for a chat message cell.
 * Mimics the basic layout and alignment based on the role.
 */
export const ChatMessageCellSkeleton: React.FC<ChatMessageCellSkeletonProps> = ({ role }) => {
  // console.log('[ChatMessageCellSkeleton] Rendering skeleton for role:', role);
  
  const isUser = role === 'user';

  return (
    <div
      className={clsx(
        styles["chat-message"], // Base message style
        isUser ? styles["chat-message-user"] : null, // User alignment
        styles["chat-message-skeleton"] // Specific skeleton style
      )}
    >
      <div className={styles["chat-message-container"]}>
        {/* Skeleton Header (Optional: can add avatar skeleton) */}
        {/* <div className={styles["chat-message-header"]}>
          <div className={styles["chat-message-avatar-skeleton"]}></div>
        </div> */}
        
        {/* Skeleton Bubble */}
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