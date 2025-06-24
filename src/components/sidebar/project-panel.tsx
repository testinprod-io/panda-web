import React from "react";
import styles from "./project-panel.module.scss";
import Locale from "@/locales";

interface ProjectPanelProps {
  onNewChat: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ onNewChat }) => {
  return (
    <div className={styles.container}>
      <div className={styles.projectHeaderContainer}>
        <div className={styles.projectHeaderText}>{Locale.Sidebar.Project}</div>
      </div>
      <div
        className={styles.newChatRow}
        onClick={onNewChat}
        role="button"
        tabIndex={0}
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>
            <img
              src="/icons/new-chat.svg"
              alt="New Chat"
              className={styles.newChatIcon}
            />
          </div>
        </div>
        <div className={styles.newChatText}>{Locale.Sidebar.NewChat}</div>
      </div>
    </div>
  );
};

export default ProjectPanel;
