import React from 'react';
import styles from './Message.module.scss';

interface MessageProps {
  content: string;
  isUser: boolean;
}

export const Message: React.FC<MessageProps> = ({ content, isUser }) => {
  return (
    <div className={`${styles.messageContainer} ${isUser ? styles.userMessage : styles.agentMessage}`}>
      {isUser ? (
        <div className={styles.userBubble}>
          {content}
        </div>
      ) : (
        <div className={styles.agentText}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Message; 