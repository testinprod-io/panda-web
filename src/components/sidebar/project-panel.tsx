import React from 'react';
import styles from './project-panel.module.scss';

interface ProjectPanelProps {
  onNewChat: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ onNewChat }) => {
  return (
    <div className={styles.container}>
      <div className={styles.projectHeaderContainer}>
        <div className={styles.projectHeaderText}>Project</div>
      </div>
      <div 
        className={styles.newChatRow} 
        onClick={onNewChat}
        role="button"
        tabIndex={0}
      >
        <div className={styles.iconContainer}> 
          <div className={styles.iconWrapper} data-size="20">
            <img src="/icons/new-chat.svg" style={{width: '20px', height: '20px'}} alt="New Chat" className={styles.newChatIcon} />
            {/* <div className={styles.newChatIconOutline} /> */}
          </div>
        </div>
        <div className={styles.newChatText}>New chat</div>
      </div>
    </div>
  );
};

export default ProjectPanel; 