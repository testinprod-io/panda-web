import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ChatMessage, RequestMessage } from "@/types";
import { copyToClipboard } from "@/utils/utils"; // Adjust path
import Locale from "@/locales"; // Adjust path
import { MultimodalContent } from "@/client/api";

import { ActionButton } from "@/components/ui/action-button";
import { LoadingAnimation } from "@/components/ui/loading-animation";
// import { GenericFileIcon } from "@/components/common/GenericFileIcon";
import CloseIcon from "@mui/icons-material/Close";
const GenericFileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="5.33333" fill="none"/>
    <path d="M21.3333 24H10.6666C9.92778 24 9.33325 23.4055 9.33325 22.6667V9.33333C9.33325 8.5945 9.92778 8 10.6666 8H16L22.6666 12.6667V22.6667C22.6666 23.4055 22.0721 24 21.3333 24Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.6666 12.6667H17.3333C16.5944 12.6667 16 12.0722 16 11.3333V8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
// MUI Imports
import { TextField, Button, Box, IconButton, Typography, CircularProgress } from "@mui/material"; // IconButton not used
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ModeEditRoundedIcon from "@mui/icons-material/ModeEditRounded";

import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"; // For expand/collapse
import ChevronRightIcon from "@mui/icons-material/ChevronRight"; // For expand/collapse

import styles from "./chat.module.scss";
import { UUID } from "crypto";
import { useApiClient } from "@/providers/api-client-provider";
import { AttestationService } from "@/services/attestation-service";
import { useWallets } from "@privy-io/react-auth";

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

interface LoadedFile {
  id: UUID;
  name: string;
  type: "image" | "pdf" | "other";
  url: string;
  isLoading: boolean;
  error?: string;
  originalType: string;
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

function getFileUrls(
  message: ChatMessage,
): string[] {
  return message.fileIds
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

  const { role, streaming, isError, isReasoning, fileIds, visibleContent: content, visibleReasoning: reasoning } =
    message;
  const { wallets } = useWallets();

  const handleResend = useCallback(
    async () => { 
      await AttestationService.getAttestation(wallets, sessionId); 
      // onResend(messageId); 
    },
    [onResend, messageId, wallets]
  );
  const handleUserStop = useCallback(
    () => onUserStop(messageId),
    [onUserStop, messageId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  const isUser = role === "user";

  const currentImageUrls = getImageUrls(content);
  
  const apiClient = useApiClient();

  useEffect(() => {
    if (!fileIds || fileIds.length === 0) {
      setLoadedFiles([]);
      return;
    }

    const fetchFiles = async () => {
      // Initialize files with loading state
      setLoadedFiles(
        fileIds.map((id) => ({
          id: id as UUID,
          name: "Loading...",
          type: "other", // Default, will be updated
          url: "",
          isLoading: true,
          originalType: "",
        }))
      );

      const newLoadedFiles: LoadedFile[] = [];

      for (const fileId of fileIds) {
        try {
          const response = await apiClient.app.getFile(sessionId, fileId as UUID);
          if (!response) {
            throw new Error("File response is undefined");
          }

          const contentType = response.headers.get("Content-Type") || "application/octet-stream";
          const contentDisposition = response.headers.get("Content-Disposition");
          let fileName = `file_${fileId}`; // Default filename

          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/i);
            if (match && match[1]) {
              fileName = match[1];
            }
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("ReadableStream not available");
          }

          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
            }
          }
          const blob = new Blob(chunks, { type: contentType });
          const url = URL.createObjectURL(blob);

          let fileType: "image" | "pdf" | "other" = "other";
          if (contentType.startsWith("image/")) {
            fileType = "image";
          } else if (contentType === "application/pdf") {
            fileType = "pdf";
          }

          newLoadedFiles.push({
            id: fileId as UUID,
            name: fileName,
            type: fileType,
            url: url,
            isLoading: false,
            originalType: contentType,
          });
        } catch (error) {
          console.error("Error fetching file:", fileId, error);
          newLoadedFiles.push({
            id: fileId as UUID,
            name: "Error loading file",
            type: "other",
            url: "",
            isLoading: false,
            error: (error as Error).message || "Unknown error",
            originalType: "",
          });
        }
      }
      setLoadedFiles(newLoadedFiles);
    };

    fetchFiles();

    // Cleanup function to revoke object URLs
    return () => {
      loadedFiles.forEach((file) => {
        if (file.url && file.url.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [fileIds, sessionId, apiClient]); // Ensure apiClient is stable or memoized if it comes from context

  // Ref to store the previous value of message.isReasoning
  const prevIsReasoningRef = React.useRef(message.isReasoning);

  useEffect(() => {
    if (isEditing) {
      setEditedText(content as string);
    }
  }, [content, isEditing]);

  useEffect(() => {
    // On initial mount or if reasoning starts
    if (message.isReasoning && !prevIsReasoningRef.current) {
      setIsReasoningCollapsed(false);
    }
    // If reasoning finishes
    else if (!message.isReasoning && prevIsReasoningRef.current) {
      setIsReasoningCollapsed(true);
    }

    // Update the ref with the current value for the next render
    prevIsReasoningRef.current = message.isReasoning;
  }, [message.isReasoning]); // Only re-run when message.isReasoning changes

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
                style={{ width: "32px", height: "32px" }}
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
                        // disabled={isChatLoading}
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
                        {/* <ReplayRoundedIcon /> */}
                      </button>
                    </>
                  )}
                  {isUser && (
                    <>
                      {/* <button
                      onClick={handleEditClick}
                      disabled={isChatLoading}
                      className={styles['user-action-button']}
                      aria-label="Edit message"
                    >
                      <ModeEditRoundedIcon />
                    </button> */}
                      <button
                        onClick={() => copyToClipboard(content as string)}
                        // disabled={isChatLoading}
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
                     {/* <Box display="flex" alignItems="center" sx={{ ml: 1 }}> */}
                      <CircularProgress size={24} color="inherit"/>
                  {/* </Box> */}
                    {/* <Typography variant="caption">Loading {file.name}...</Typography> */}
                  </Box>
                );
              }
              if (file.error) {
                return (
                  <Box key={file.id} className={styles["chat-message-file-item-error"]}>
                    <GenericFileIcon /> {/* Or a specific error icon */}
                    <Typography variant="caption" color="error">
                      Error: {file.name} ({file.error})
                    </Typography>
                  </Box>
                );
              }
              if (file.type === "image") {
                return (
                  <a 
                    key={`${file.id}-anchor`}
                    href={file.url} 
                    download={file.name} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }} // Optional: remove underline from link
                  >
                    <Image
                      key={file.id}
                      className={styles["chat-message-item-image-outside"]}
                      src={file.url}
                      alt={file.name || `attached image ${file.id}`}
                      width={160} // Adjust as needed
                      height={160} // Adjust as needed
                      style={{
                        borderRadius: "8px",
                        outline: "1px #CACACA solid",
                        objectFit: "cover",
                        display: "block", // Ensure image behaves like a block for the anchor
                      }}
                    />
                  </a>
                );
              }
              if (file.type === "pdf") {
                return (
                  <a 
                    key={`${file.id}-anchor`}
                    href={file.url} 
                    download={file.name} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', display: 'block' }} // Optional: remove underline and make it block
                  >
                    <Box
                      key={file.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px",
                        borderRadius: "8px",
                        backgroundColor: "#f0f0f0", // Light background for the PDF item
                        border: "1px solid #e0e0e0",
                        maxWidth: "100%",
                        cursor: "pointer", // Indicate it's clickable
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
              // Fallback for 'other' file types
              return (
                <a 
                  key={`${file.id}-anchor`}
                  href={file.url} 
                  download={file.name}
                  style={{ textDecoration: 'none', display: 'block' }} // Optional: remove underline and make it block
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
                      cursor: "pointer", // Indicate it's clickable
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
