"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import styles from "./chat.module.scss"; // Use styles from the main chat component

export function ChatComponentSkeleton() {
  const skeletonMessageCount = 6; // Number of skeleton messages

  return (
    <div className={styles["chat-body"]} aria-hidden="true">
      {Array.from({ length: skeletonMessageCount }).map((_, index) => {
        const isUser = index % 2 !== 0; // Alternate roles for visual variety
        // Use string literals for roles in class names
        const roleString = isUser ? 'user' : 'system';

        return (
          <div
            key={index}
            // Apply role-specific class name using the string literal
            className={`${styles["chat-message"]} ${styles[`chat-message-${roleString}`]}`}
          >
            <div className={styles["chat-message-container"]}>
              <div className={styles["chat-message-header"]}>
                {/* Skeleton for Avatar/Role Icon */}
                <div className={styles["chat-message-avatar"]}>
                  <Skeleton circle={true} height={30} width={30} />
                </div>
              </div>
              <div className={styles["chat-message-item"]}>
                 {/* Skeleton for message content */}
                 <Skeleton count={Math.floor(Math.random() * 2) + 1} width={`${Math.floor(Math.random() * 40) + 30}%`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 