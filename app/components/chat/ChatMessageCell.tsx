import React, { Fragment, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import {
  useAppConfig,
  useChatStore,
} from "@/app/store"; // Adjust path
import { ChatMessage } from "@/app/types";
import {
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  useMobileScreen,
} from "@/app/utils"; // Adjust path
import Locale from "@/app/locales"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; // Added Snackbar hook

import { ChatAction } from "@/app/components/chat/ChatAction";
import { FormattedDate } from "@/app/components/FormattedDate"; // Import the new component

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
  loading: () => <LoopIcon className={styles.loadingIcon}/>, // Use MUI LoopIcon for loading
});

interface ChatMessageCellProps {
  message: ChatMessage & { preview?: boolean };
  index: number; // Global index
  isUser: boolean;
  isContext: boolean;
  isLoading: boolean; // Pass isLoading to conditionally render actions
  showActions: boolean;
  fontSize: number;
  fontFamily: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  renderMessagesLength: number; // Total number of messages being rendered currently
  onResend: (message: ChatMessage) => void;
  onDelete: (messageId: string) => void; // Kept for now, can be removed if not needed for bot
  onUserStop: (messageId: string) => void;
  onEditSubmit: (originalMessage: ChatMessage, newText: string) => void;
}

export function ChatMessageCell(props: ChatMessageCellProps) {
  const {
    message,
    index,
    isUser,
    isContext,
    isLoading,
    showActions,
    fontSize,
    fontFamily,
    scrollRef,
    renderMessagesLength,
    onResend,
    onDelete, // Kept
    onUserStop,
    onEditSubmit,
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const messageDate = typeof message.date === 'string' ? new Date(message.date) : message.date;

  const handleEditClick = () => {
    setEditedText(getMessageTextContent(message));
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSendClick = () => {
    if (editedText.trim() === getMessageTextContent(message).trim()) {
        // If text hasn't changed, just cancel editing
        setIsEditing(false);
        return;
    }
    onEditSubmit(message, editedText);
    setIsEditing(false);
  };

  return (
    <div
      className={clsx(
        styles["chat-message"],
        isUser && styles["chat-message-user"],
        message.streaming && styles["chat-message-streaming"],
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
                key={`${message.id}-${message.streaming ? "streaming" : "done"}`}
                content={getMessageTextContent(message)}
                loading={
                  (message.preview || message.streaming) &&
                  !isUser &&
                  getMessageTextContent(message).length === 0
                }
                fontSize={fontSize}
                fontFamily={fontFamily}
                parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                defaultShow={index >= renderMessagesLength - 6}
              />
              {getMessageImages(message).map((image, imgIndex) => (
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
              {/* REMOVED Streaming Stop Button - Handled by Input Panel Now */}
              {/* {message.streaming && !isUser ? (
                <ChatAction
                  text={Locale.Chat.Actions.Stop}
                  icon={<StopCircleIcon />}
                  onClick={() => onUserStop(message.id!)}
                />
              ) : ( */} 
              <>
                {!isUser && (
                  <>
                    <ChatAction
                      text={null}
                      icon={<ReplayRoundedIcon/>}
                      onClick={() => onResend(message)}
                      disabled={isLoading}
                    />
                    <ChatAction
                      text={null}
                      icon={<ContentCopyRoundedIcon/>}
                      onClick={() => copyToClipboard(getMessageTextContent(message))}
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
                      onClick={() => copyToClipboard(getMessageTextContent(message))}
                    />
                  </>
                )}
              </>
            </div>
          </div>
        )}
        {/* Date remains at the bottom */}
        {/* {!isEditing && (
          <div className={styles["chat-message-action-date"]}>
            {isContext ? Locale.Chat.IsContext : <FormattedDate date={messageDate} />}
          </div>
        )} */}
      </div>
    </div>
  );
} 