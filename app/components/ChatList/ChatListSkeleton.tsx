"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css"; // Import skeleton styles
import styles from "./chat-list.module.scss"; // Reuse existing styles if applicable
import clsx from "clsx";

interface ChatListSkeletonProps {
  count?: number; // Add count prop
}

export function ChatListSkeleton({ count }: ChatListSkeletonProps) {
  // Default to 1 item if count is not provided or for pagination, 
  // or use a larger number for initial full-page skeleton.
  // Let's make the default 1 for when it's used for pagination loading.
  // If a larger number is needed for initial full page skeleton, ChatList can pass it.
  const skeletonItemCount = count === undefined ? 5 : count;

  return (
    <div className={styles["chat-list"]} aria-hidden="true">
      {Array.from({ length: skeletonItemCount }).map((_, index) => (
        // Each skeleton item should mimic the ChatItem structure
        // The ChatItem's root is a ListItemButton, we can use a div with similar classes.
        <div key={index} className={clsx(styles["chat-item"], styles["chat-item-skeleton"])}>
          {/* Mimic the chat-item-highlight Box */}
          <div className={styles["chat-item-highlight"]} style={{ width: '100%', paddingRight: '50px' }}>
            {/* Title placeholder - should be more prominent */}
            {/* The actual ChatItem title is a span or TextField */}
            <span className={styles["chat-item-title"]}>
              <Skeleton width={`100%`} height={`1.2em`} /> {/* Adjust width and height as needed */}
            </span>
            {/* No explicit "chat-item-info" in the ChatItem, so we can omit or simplify */}
            {/* If we want a subtle line for date/time, it's usually smaller or part of actions */}

            {/* Placeholder for action icons (MoreVertIcon) - optional, but good for structure */}
            {/* <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <Skeleton circle width={24} height={24} />
            </div> */}
          </div>
        </div>
      ))}
    </div>
  );
} 