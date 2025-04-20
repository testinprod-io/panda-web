import React from "react";
import { useChatStore } from "@/app/store"; 
import { ChatSession } from "@/app/types"; 
import Locale from "@/app/locales"; 
import styles from "@/app/components/chat/chat.module.scss"; 

export function ClearContextDivider() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  if (!session) {
    return null; // Don't render if there's no session
  }

  return (
    <div
      className={styles["clear-context"]}
      onClick={() =>
        chatStore.updateTargetSession(
          session,
          (session: ChatSession) => (session.clearContextIndex = undefined),
        )
      }
    >
      <div className={styles["clear-context-tips"]}>{Locale.Context.Clear}</div>
      <div className={styles["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
} 