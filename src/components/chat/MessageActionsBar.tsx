import React from 'react';
import { Box } from '@mui/material';
import { copyToClipboard } from '@/utils/utils';
import styles from './chat.module.scss'; // Reusing chat styles
import { ChatMessage } from '@/types'; // For content and reasoning types, though direct strings are passed

interface MessageActionsBarProps {
  isUser: boolean;
  isChatLoading: boolean;
  // Removed isStreaming and isReasoning as parent ChatMessageCell already checks this for rendering this component
  messageContent: string | null | undefined; // From visibleContent
  reasoningText: string | null | undefined;
  onResend: () => void;
  // onEdit?: () => void; // If edit functionality is added back
}

export const MessageActionsBar: React.FC<MessageActionsBarProps> = ({
  isUser,
  isChatLoading,
  messageContent,
  reasoningText,
  onResend,
}) => {
  const contentToCopy = messageContent || "";
  const fullContentToCopy = reasoningText 
    ? `${contentToCopy}\n\n[Reasoning]:\n${reasoningText}` 
    : contentToCopy;

  if (isUser) {
    return (
      <Box
        className={styles["chat-message-actions"]}
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <button
          onClick={() => copyToClipboard(contentToCopy)}
          className={styles["user-action-button"]}
          aria-label="Copy message"
          title="Copy message"
        >
          <img src="/icons/copy.svg" alt="Copy message" />
        </button>
        {/* Add Edit button here if re-enabled, calling onEdit */}
      </Box>
    );
  }

  // Assistant/System messages
  return (
    <Box 
      className={styles["chat-message-actions"]} 
      // No specific sx needed here if default chat-message-actions alignment is fine
    >
      <button
        onClick={() => copyToClipboard(fullContentToCopy)}
        className={styles["user-action-button"]}
        aria-label="Copy message and reasoning"
        title="Copy message and reasoning"
      >
        <img src="/icons/copy.svg" alt="Copy message and reasoning" />
      </button>
      <button
        onClick={onResend}
        disabled={isChatLoading}
        className={styles["user-action-button"]}
        aria-label="Resend message"
        title="Resend message"
      >
        <img src="/icons/refresh.svg" alt="Resend message" />
      </button>
    </Box>
  );
};