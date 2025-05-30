import React from 'react';
import clsx from 'clsx';
import { Role } from '@/types'; // Assuming MessageRole is defined here
// import styles from './chat.module.scss'; // SCSS import removed

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

  // Base classes for the message skeleton structure
  const baseMessageClass = "w-[70%] mx-auto my-2.5 flex flex-row max-lg:w-[80%] max-md:w-[95%]";
  const userMessageClass = "flex-row-reverse";
  const skeletonContainerClass = "w-full flex flex-col gap-1.5 md:gap-2.5";
  const skeletonAlignmentClass = isUser ? "items-end" : "items-start";
  
  // Skeleton bubble and line classes with Tailwind
  const skeletonBubbleClass = "bg-gray-200 rounded-2xl p-3 min-h-[50px] flex flex-col gap-2 animate-pulse";
  // Note: For a more specific pulse, you might define custom keyframes in tailwind.config.js if needed.
  // For simplicity, using Tailwind's default pulse on the bubble.
  const skeletonLineClass = "bg-gray-300 h-2.5 rounded";

  return (
    <div
      className={clsx(
        baseMessageClass,
        isUser && userMessageClass,
        "opacity-70" // Specific skeleton style: opacity
      )}
    >
      <div className={clsx(skeletonContainerClass, skeletonAlignmentClass)}>
        {/* Optional: Avatar skeleton for bot messages */}
        {!isUser && (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse shrink-0 mb-1"></div>
        )}
        {/* Skeleton Bubble */}
        <div className={clsx(
            skeletonBubbleClass, 
            isUser ? "bg-gray-200" : "bg-gray-200", // Can differentiate user/bot skeleton bubble color if needed
            "w-3/4 sm:w-1/2 md:w-2/5" // Example width, adjust as needed
        )}>
          <div className={skeletonLineClass} style={{ width: '80%' }}></div>
          <div className={skeletonLineClass} style={{ width: '60%' }}></div>
          {/* Optionally add a third shorter line for more realism */}
          {/* <div className={skeletonLineClass} style={{ width: '40%' }}></div> */}
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