import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ChatMessage, RequestMessage } from "@/types";
import { copyToClipboard } from "@/utils/utils"; // Adjust path
import Locale from "@/locales"; // Adjust path
import { MultimodalContent } from "@/client/api";
import { EncryptionService } from "@/services/encryption-service";

import { ActionButton } from "@/components/ui/action-button";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { GenericFileIcon } from "../../common/GenericFileIcon";
import CloseIcon from "@mui/icons-material/Close";
// const GenericFileIcon = () => ( ... ); // This will be removed and imported

// MUI Imports
import { TextField, Button, Box, Typography, CircularProgress, IconButton } from "@mui/material"; // IconButton removed, ReplayRoundedIcon, ModeEditRoundedIcon removed

import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import styles from "./chat.module.scss";
import { UUID } from "crypto";
import { useApiClient } from "@/providers/api-client-provider";
import { AttestationService } from "@/services/attestation-service";
import { useWallets } from "@privy-io/react-auth";
import { useEncryption } from "@/providers/encryption-provider";
import { useLoadedFiles, LoadedFile } from "@/hooks/use-loaded-files";

const Markdown = dynamic(async () => (await import("../ui/markdown")).Markdown, {
  loading: () => <LoadingAnimation />,
});

interface ChatMessageCellProps {
  sessionId: UUID;
  messageId: UUID;
  message: ChatMessage;
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

function getTextContent(
  content: string | MultimodalContent[] | null | undefined
): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (
      content.find((item) => item.type === "text")?.text || "[Non-text content]"
    );
  }
  return "";
}

function getImageUrls(
  content: string | MultimodalContent[] | null | undefined
): string[] {
  if (
    content === null ||
    content === undefined ||
    typeof content === "string" ||
    !Array.isArray(content)
  ) {
    return [];
  }
  return content
    .filter((item) => item.type === "image_url" && item.image_url?.url)
    .map((item) => item.image_url!.url);
}

function getReasoningText(reasoning: string | undefined | null): string {
  return reasoning || "";
}

export const ChatMessageCell = React.memo(function ChatMessageCell(
  props: ChatMessageCellProps
) {
  const {
    sessionId,
    messageId,
    message,
    index,
    isLoading: isChatLoading,
    showActions,
    fontSize,
    fontFamily,
    scrollRef,
    renderMessagesLength,
    onResend,
    onUserStop,
    onEditSubmit,
  } = props;

  const { role, streaming, isError, isReasoning, files, visibleContent: content, visibleReasoning: reasoning } =
    message;
  const { wallets } = useWallets();
  const { isLocked } = useEncryption();
  const apiClient = useApiClient();

  const loadedFiles = useLoadedFiles(files, sessionId, apiClient, isLocked);

  const handleResend = useCallback(
    async () => { 
      await AttestationService.getAttestation(wallets, sessionId); 
    },
    [onResend, messageId, wallets, sessionId]
  );
  const handleUserStop = useCallback(
    () => onUserStop(messageId),
    [onUserStop, messageId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);

  const isUser = role === "user";
  const currentImageUrls = getImageUrls(content);

  const prevIsReasoningRef = React.useRef(message.isReasoning);
  useEffect(() => {
    if (isEditing) {
      setEditedText(content as string);
    }
  }, [content, isEditing]);

  useEffect(() => {
    if (message.isReasoning && !prevIsReasoningRef.current) {
      setIsReasoningCollapsed(false);
    }
    else if (!message.isReasoning && prevIsReasoningRef.current) {
      setIsReasoningCollapsed(true);
    }
    prevIsReasoningRef.current = message.isReasoning;
  }, [message.isReasoning]);

  const handleEditClick = useCallback(() => {
    setEditedText(content as string);
    setIsEditing(true);
  }, [content]);

  const handleCancelClick = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSendClick = useCallback(() => {
    if (typeof content !== 'string') { return; }
    if (editedText.trim() === content.trim()) {
      setIsEditing(false);
      return;
    }
    onEditSubmit(messageId, editedText);
    setIsEditing(false);
  }, [messageId, editedText, content, onEditSubmit]);

  const toggleReasoningCollapse = useCallback(() => {
    setIsReasoningCollapsed((prev) => !prev);
  }, []);

  if (isError) {
    return (
      <div className={clsx(styles["chat-message"])}>
        <div className={styles["chat-message-container"]}>
          <div className={styles["chat-message-actions"]}>
            <div className={styles["chat-input-actions"]}>
              <ActionButton
                text={null}
                icon={<img src="/icons/refresh.svg" alt="Resend message" />}
                onClick={handleResend}
                disabled={isChatLoading}
              />
            </div>
          </div>
          <div
            className={clsx(
              styles["chat-message-item"],
              styles["chat-message-error-bubble"]
            )}
          >
            <div className={styles["chat-message-error-content-inner"]}>
              <span style={{ fontWeight: 500 }}>
                Something went wrong. <br />
                If this issue persists please contact us at
              </span>
              <span style={{ fontWeight: 700, color: "#F33D4F" }}>
                {" "}
                help.panda.com.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showReasoning = !isUser && (reasoning || isReasoning);
  return (
    <div
      className={clsx(
        styles["chat-message"],
        isUser && styles["chat-message-user"],
        !isUser && styles["chat-message-system"],
        (streaming || isReasoning) && styles["chat-message-streaming"]
      )}
    >
      <Box
        className={styles["chat-message-container"]}
        sx={
          isUser
            ? {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "10px",
              }
            : {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "10px",
              }
        }
      >
        <div className={styles["chat-message-header"]}>
          {!isUser && (
            <div className={styles["chat-message-avatar"]}>
              <img
                src="/icons/panda.svg"
                alt="Panda"
              />
            </div>
          )}

          {showActions && !isEditing && (
            <Box
              className={styles["chat-message-actions"]}
              sx={
                isUser
                  ? {
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "4px",
                    }
                  : {}
              }
            >
              {!(streaming || isReasoning) && (
                <>
                  {!isUser && (
                    <>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            content +
                              (reasoning
                                ? `\n\n[Reasoning]:\n${reasoning}`
                                : "")
                          )
                        }
                        className={styles["user-action-button"]}
                        aria-label="Copy message content and reasoning"
                      >
                        <img
                          src="/icons/copy.svg"
                          alt="Copy message content and reasoning"
                        />
                      </button>
                      <button
                        onClick={handleResend}
                        disabled={isChatLoading}
                        className={styles["user-action-button"]}
                        aria-label="Resend message"
                      >
                        <img src="/icons/refresh.svg" alt="Resend message" />
                      </button>
                    </>
                  )}
                  {isUser && (
                    <>
                      <button
                        onClick={() => copyToClipboard(content as string)}
                        className={styles["user-action-button"]}
                        aria-label="Copy message"
                      >
                        <img src="/icons/copy.svg" alt="Copy message" />
                      </button>
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </div>
        
        {loadedFiles.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: isUser ? "flex-end" : "flex-start",
              width: "100%",
              maxWidth: "460px",
            }}
          >
            {loadedFiles.map((file) => {
              if (file.isLoading) {
                return (
                  <Box key={file.id} className={styles["chat-message-item-loading"]} display="flex" alignItems="center" justifyContent="center" style={{
                    borderRadius: "8px",
                    outline: "1px #CACACA solid",
                    backgroundColor: "#F0F0F0",
                    objectFit: "cover",
                    width: "160px",
                    height: "160px",
                  }} >
                    <CircularProgress size={24} color="inherit"/>
                  </Box>
                );
              }
              if (file.error) {
                return (
                  <Box key={file.id} className={styles["chat-message-file-item-error"]}>
                    <GenericFileIcon />
                    <Typography variant="caption" color="error">
                      Error: {file.name} ({file.error})
                    </Typography>
                  </Box>
                );
              }
              if (file.type.startsWith("image")) {
                return (
                  <a 
                    key={`${file.id}-anchor`}
                    href={file.url} 
                    download={file.name} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Image
                      key={file.id}
                      className={clsx(styles["chat-message-item-image-outside"], styles.attachedFileImagePreview)}
                      src={file.url}
                      alt={file.name || `attached image ${file.id}`}
                      width={160}
                      height={160}
                    />
                  </a>
                );
              }
              if (file.type.startsWith("application/pdf") || file.type.startsWith("pdf")) {
                return (
                  <a 
                    key={`${file.id}-anchor`}
                    href={file.url} 
                    download={file.name} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <Box
                      key={file.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px",
                        borderRadius: "8px",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #e0e0e0",
                        maxWidth: "100%",
                        cursor: "pointer",
                      }}
                    >
                      <GenericFileIcon />
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            fontWeight: 500,
                          }}
                        >
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          PDF Document {file.originalType ? `(${file.originalType})` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  </a>
                );
              }
              return (
                <a 
                  key={`${file.id}-anchor`}
                  href={file.url} 
                  download={file.name}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <Box
                    key={file.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      borderRadius: "8px",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #e0e0e0",
                      cursor: "pointer",
                    }}
                  >
                    <GenericFileIcon />
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          fontWeight: 500,
                        }}
                      >
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {file.originalType || "File"}
                      </Typography>
                    </Box>
                  </Box>
                </a>
              );
            })}
          </Box>
        )}

        <Box className={styles["chat-message-item"]}>
          {showReasoning && (
            <Box
              className={styles["chat-message-reasoning-container"]}
              sx={{ mb: 1, p: 1, borderRadius: 1 }}
            >
              <Box
                display="flex"
                alignItems="center"
                onClick={toggleReasoningCollapse}
                sx={{ cursor: "pointer" }}
              >
                <IconButton size="small" sx={{ mr: 0.5 }}>
                  {isReasoningCollapsed ? (
                    <ChevronRightIcon fontSize="inherit" />
                  ) : (
                    <ExpandMoreIcon fontSize="inherit" />
                  )}
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: "medium", color: "text.secondary" }}
                >
                  {isReasoning
                    ? "Thinking..."
                    : message.reasoningTime && message.reasoningTime > 0
                    ? `Thought for ${(message.reasoningTime / 1000).toFixed(
                        1
                      )} seconds`
                    : "Processing complete"}
                </Typography>
                {isReasoning && !reasoning && (
                  <Box sx={{ ml: 1 }}>
                    <LoadingAnimation />
                  </Box>
                )}
              </Box>
              {!isReasoningCollapsed && reasoning && (
                <Box
                  sx={{
                    mt: 1,
                    pl: 2.5,
                    borderLeft: `2px solid rgba(0,0,0,0.1)`,
                    ml: 1.2,
                    color: "text.disabled",
                  }}
                >
                  <Markdown
                    content={reasoning}
                    fontSize={fontSize * 0.85}
                    fontFamily={fontFamily}
                    parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  />
                </Box>
              )}
            </Box>
          )}

          {isEditing ? (
            <Box sx={{ width: "100%" }}>
              <TextField
                fullWidth
                multiline
                variant="outlined"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendClick();
                  }
                  if (e.key === "Escape") {
                    handleCancelClick();
                  }
                }}
                sx={{ marginBottom: 1 }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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
                  disabled={editedText.trim() === "" || isChatLoading}
                  startIcon={<SendIcon />}
                >
                  {Locale.UI.Confirm}
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              {(content ||
                currentImageUrls.length > 0 ||
                (streaming && !isUser && !showReasoning)) && (
                <Markdown
                  key={`${messageId}-${streaming ? "streaming" : "done"}-${
                    isReasoning ? "reasoning" : "content"
                  }`}
                  content={content as string}
                  loading={
                    streaming &&
                    !isUser &&
                    content.length === 0 &&
                    !isReasoning
                  }
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  defaultShow={index >= renderMessagesLength - 6}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </div>
  );
});
