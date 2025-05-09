import React, { useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { useAppConfig } from "@/app/store"; 
import { EncryptedMessage, MessageRole } from "@/app/types"; 
import {
  copyToClipboard,
} from "@/app/utils"; // Adjust path
import Locale from "@/app/locales"; // Adjust path
import { useSnackbar } from "@/app/components/SnackbarProvider"; 
import { MultimodalContent } from "@/app/client/api";

import { ChatAction } from "@/app/components/chat/ChatAction";
import { LoadingAnimation } from "@/app/components/common/LoadingAnimation"; 

// MUI Imports
import { TextField, Button, Box } from "@mui/material"; // IconButton not used
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ModeEditRoundedIcon from '@mui/icons-material/ModeEditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'; // Added for delete action

import StopCircleIcon from '@mui/icons-material/StopCircle';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';

import styles from "./chat.module.scss";
import { UUID } from "crypto";

const Markdown = dynamic(async () => (await import("../markdown")).Markdown, {
  loading: () => <LoadingAnimation />, 
});

interface ChatMessageCellProps {
  messageId: UUID;
  role: MessageRole;
  decryptedContent: string | MultimodalContent[] | null;
  encryptedMessage: EncryptedMessage;
  isStreaming?: boolean;
  isError?: boolean;
  index: number; 
  isLoading: boolean; 
  showActions: boolean;
  fontSize: number;
  fontFamily: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  renderMessagesLength: number; 
  onResend: (messageId: UUID) => void;
  onUserStop: (messageId: UUID) => void;
  onEditSubmit: (messageId: UUID, newText: string) => void;
}

function getDecryptedText(content: string | MultimodalContent[] | null): string {
    if (content === null) return Locale.Store.Error; // Use a valid Locale key for error
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.find(item => item.type === 'text')?.text || "[Non-text content]";
    }
    return "";
}

function getDecryptedImages(content: string | MultimodalContent[] | null): string[] {
    if (content === null || typeof content === 'string' || !Array.isArray(content)) {
        return [];
    }
    return content.filter(item => item.type === 'image_url' && item.image_url?.url).map(item => item.image_url!.url);
}

export const ChatMessageCell = React.memo(function ChatMessageCell(props: ChatMessageCellProps) {
  const {
    messageId,
    role,
    decryptedContent,
    encryptedMessage,
    isStreaming,
    isError,
    index,
    isLoading, 
    showActions,
    fontSize,
    fontFamily,
    scrollRef,
    renderMessagesLength,
    onResend,
    onUserStop,
    onEditSubmit,
  } = props;
  
  // Actions specific to ChatMessageCell, using props for callbacks
  const handleResend = useCallback(() => onResend(messageId), [onResend, messageId]);
  const handleUserStop = useCallback(() => onUserStop(messageId), [onUserStop, messageId]);

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const isUser = role === "user";

  const textContent = getDecryptedText(decryptedContent);
  const images = getDecryptedImages(decryptedContent);

  const handleEditClick = useCallback(() => {
    setEditedText(textContent);
    setIsEditing(true);
  }, [textContent]);

  const handleCancelClick = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSendClick = useCallback(() => {
    if (editedText.trim() === textContent.trim()) {
        setIsEditing(false);
        return;
    }
    onEditSubmit(messageId, editedText);
    setIsEditing(false);
  }, [editedText, textContent, onEditSubmit]);

  if (isError) {
    return (
      <div className={clsx(styles["chat-message"], styles["chat-message-error"]) }>
        <div className={styles["chat-message-container"]}>
          <div className={styles["chat-message-item"]}>
            {/* Use textContent which already defaults to an error string from getDecryptedText if needed */}
            <Markdown content={textContent} /> 
          </div>
          <div className={styles["chat-message-actions"]}>
             {!isUser && (
                <ChatAction
                    text={null}
                    icon={<ReplayRoundedIcon/>}
                    onClick={handleResend}
                />
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <div className={styles["chat-message-avatar"]}></div>
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
                <Button variant="outlined" size="small" onClick={handleCancelClick} startIcon={<CancelIcon />}>
                  {Locale.UI.Cancel}
                </Button>
                <Button variant="contained" size="small" onClick={handleSendClick} disabled={editedText.trim() === ""} startIcon={<SendIcon />}>
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
                  (isStreaming) &&
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
        {showActions && !isEditing && (
          <div className={styles["chat-message-actions"]}>
            <div className={styles["chat-input-actions"]}>
              {isStreaming && !isUser ? (
                <ChatAction
                  text={null}
                  icon={<StopCircleIcon />}
                  onClick={handleUserStop} 
                />
              ) : (
                <>
                  {!isUser && (
                    <>
                      <ChatAction text={null} icon={<ReplayRoundedIcon/>} onClick={handleResend} disabled={isLoading}/>
                      <ChatAction text={null} icon={<ContentCopyRoundedIcon/>} onClick={() => copyToClipboard(textContent)}/>
                      {/* Add Delete button for bot messages if needed */}
                      {/* <ChatAction text={null} icon={<DeleteOutlineRoundedIcon />} onClick={handleDelete} disabled={isLoading} /> */}
                    </>
                  )}
                  {isUser && (
                    <>
                      <ChatAction text={null} icon={<ModeEditRoundedIcon/>} onClick={handleEditClick} disabled={isLoading}/>
                      <ChatAction text={null} icon={<ContentCopyRoundedIcon/>} onClick={() => copyToClipboard(textContent)}/>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}); 