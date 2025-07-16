import React from "react";
import clsx from "clsx";
import { Role } from "@/types";
import styles from "./chat.module.scss";

interface ChatMessageCellSkeletonProps {
  role: Role;
}

export const ChatMessageCellSkeleton: React.FC<
  ChatMessageCellSkeletonProps
> = ({ role }) => {
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
          <div
            className={styles["skeleton-line"]}
            style={{ width: "80%" }}
          ></div>
          <div
            className={styles["skeleton-line"]}
            style={{ width: "60%" }}
          ></div>
        </div>
      </div>
    </div>
  );
};
