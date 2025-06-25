import React from "react";
import styles from "./project-panel.module.scss";
import Locale from "@/locales";

import NewChatIcon from "@/public/icons/new-chat.svg";
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
          <NewChatIcon className={styles.newChatIcon} />
        </div>
        <div className={styles.newChatText}>{Locale.Sidebar.NewChat}</div>
      </div>
    </div>
  );
};

export default ProjectPanel;
