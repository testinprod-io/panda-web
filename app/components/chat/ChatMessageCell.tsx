import React, { Fragment, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import {
  useAppConfig,
  useChatStore,
} from "@/app/store"; // Adjust path
import { ChatMessage, EncryptedMessage, MessageRole } from "@/app/types";
import {
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  useMobileScreen,
} from "@/app/utils"; // Adjust path
import Locale from "@/app/locales"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook
import { MultimodalContent } from "@/app/client/api"; // Import MultimodalContent

import { ChatAction } from "@/app/components/chat/ChatAction";
import { FormattedDate } from "@/app/components/FormattedDate"; // Import the new component
import { LoadingAnimation } from "@/app/components/common/LoadingAnimation"; // Import the new animation

// MUI Imports
import { IconButton, TextField, Button, Box } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LoopIcon from '@mui/icons-material/Loop'; // Loading icon alternative
import ReplayIcon from '@mui/icons-material/Replay'; // Reset/Retry icon

import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ModeEditRoundedIcon from '@mui/icons-material/ModeEditRounded';

import StopCircleIcon from '@mui/icons-material/StopCircle';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';

import styles from "./chat.module.scss";

// Dynamic import for Markdown component
const Markdown = dynamic(async () => (await import("../markdown")).Markdown, {
  loading: () => <LoadingAnimation />, // Use the new LoadingAnimation component
});

interface ChatMessageCellProps {
  messageId: string;
  role: MessageRole;
  date: Date;
  decryptedContent: string | MultimodalContent[] | null;
  encryptedMessage: EncryptedMessage;
  isStreaming?: boolean;
  isError?: boolean;
  preview?: boolean;
  model?: string;
  index: number; // Global index
  isContext: boolean;
  isLoading: boolean; // Overall chat loading state
  showActions: boolean;
  fontSize: number;
  fontFamily: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  renderMessagesLength: number; // Total number of messages being rendered currently
  onResend: (message: EncryptedMessage) => void;
  onDelete: (messageId: string) => void;
  onUserStop: (messageId: string) => void;
  onEditSubmit: (originalMessage: EncryptedMessage, newText: string) => void;
}

// Helper to extract text content safely from decrypted data
function getDecryptedText(content: string | MultimodalContent[] | null): string {
    if (content === null) return "Error: Could not decrypt content";
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        // Find the first text part or return a placeholder
        return content.find(item => item.type === 'text')?.text || "[Non-text content]";
    }
    return "";
}

// Helper to extract images safely from decrypted data
function getDecryptedImages(content: string | MultimodalContent[] | null): string[] {
    if (content === null || typeof content === 'string' || !Array.isArray(content)) {
        return [];
    }
    return content.filter(item => item.type === 'image_url' && item.image_url?.url).map(item => item.image_url!.url);
}

export function ChatMessageCell(props: ChatMessageCellProps) {
  const {
    messageId,
    role,
    date,
    decryptedContent,
    encryptedMessage,
    isStreaming,
    isError,
    preview,
    model,
    index,
    isContext,
    isLoading,
    showActions,
    fontSize,
    fontFamily,
    scrollRef,
    renderMessagesLength,
    onResend,
    onDelete,
    onUserStop,
    onEditSubmit,
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const isUser = role === "user";
  const config = useAppConfig();

  // Extract text and images using helpers
  const textContent = getDecryptedText(decryptedContent);
  const images = getDecryptedImages(decryptedContent);

  const handleEditClick = () => {
    setEditedText(textContent);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSendClick = () => {
    if (editedText.trim() === textContent.trim()) {
        setIsEditing(false);
        return;
    }
    onEditSubmit(encryptedMessage, editedText);
    setIsEditing(false);
  };

  return (
    <div
      className={clsx(
        styles["chat-message"],
        isUser && styles["chat-message-user"],
        isStreaming && styles["chat-message-streaming"],
      )}
    >
      <div className={styles["chat-message-container"]}>
        <div className={styles["chat-message-header"]}>
          <div className={styles["chat-message-avatar"]}>
            {/* Avatar Logic Here - Removed Role Label */}
            {/* {isUser ? "You" : "Bot"} */}
          </div>
          {/* Actions div removed from header */}
        </div>
        <div className={styles["chat-message-item"]}>
          {isEditing ? (
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                multiline
                variant="outlined"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendClick();
                    }
                    if (e.key === 'Escape') {
                        handleCancelClick();
                    }
                }}
                sx={{ marginBottom: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleCancelClick} 
                  startIcon={<CancelIcon />}
                >
                  {Locale.UI.Cancel}
                </Button>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={handleSendClick} 
                  disabled={editedText.trim() === ""}
                  startIcon={<SendIcon />}
                >
                  {Locale.UI.Confirm}
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <Markdown
                key={`${messageId}-${isStreaming ? "streaming" : "done"}`}
                content={textContent}
                loading={
                  (preview || isStreaming) &&
                  !isUser &&
                  textContent.length === 0
                }
                fontSize={fontSize}
                fontFamily={fontFamily}
                parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                defaultShow={index >= renderMessagesLength - 6}
              />
              {images.map((image, imgIndex) => (
                 <Image
                   key={imgIndex}
                   className={styles["chat-message-item-image"]}
                   src={image}
                   alt={`attached image ${imgIndex + 1}`}
                   width={300}
                   height={300}
                   style={{ objectFit: "contain", marginTop: '10px' }}
                 />
               ))}
            </>
          )}
        </div>
        {/* Actions div moved below chat-message-item */}
        {showActions && !isEditing && (
          <div className={styles["chat-message-actions"]}>
            <div className={styles["chat-input-actions"]}>
              {isStreaming && !isUser ? (
                <ChatAction
                  text={null}
                  icon={<StopCircleIcon />}
                  onClick={() => onUserStop(messageId)}
                />
              ) : (
                <>
                  {!isUser && (
                    <>
                      <ChatAction
                        text={null}
                        icon={<ReplayRoundedIcon/>}
                        onClick={() => onResend(encryptedMessage)}
                        disabled={isLoading}
                      />
                      <ChatAction
                        text={null}
                        icon={<ContentCopyRoundedIcon/>}
                        onClick={() => copyToClipboard(textContent)}
                      />
                    </>
                  )}
                  {isUser && (
                    <>
                      <ChatAction
                        text={null}
                        icon={<ModeEditRoundedIcon/>}
                        onClick={handleEditClick}
                        disabled={isLoading}
                      />
                      <ChatAction
                        text={null}
                        icon={<ContentCopyRoundedIcon/>}
                        onClick={() => copyToClipboard(textContent)}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {/* Date remains at the bottom */}
        {/* {!isEditing && (
          <div className={styles["chat-message-action-date"]}>
            {isContext ? Locale.Chat.IsContext : <FormattedDate date={date} />}
          </div>
        )} */}
      </div>
    </div>
  );
} 