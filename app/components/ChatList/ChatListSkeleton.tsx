"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css"; // Import skeleton styles
import styles from "./chat-list.module.scss"; // Reuse existing styles if applicable

export function ChatListSkeleton() {
  // Determine a reasonable number of skeleton items to show
  const skeletonItemCount = 5;

  return (
    <div className={styles["chat-list"]} aria-hidden="true">
      {Array.from({ length: skeletonItemCount }).map((_, index) => (
        <div key={index} className={styles["chat-item"]}>
          <div className={styles["chat-item-main"]}>
            <div className={styles["chat-item-title"]}>
              <Skeleton width={`60%`} />
            </div>
            <div className={styles["chat-item-info"]}>
              <Skeleton width={`40%`} />
            </div>
          </div>
          {/* Optional: Add skeleton for actions if they are visible normally */}
          {/* <div className={styles["chat-item-actions"]}> ... </div> */}
        </div>
      ))}
    </div>
  );
} 