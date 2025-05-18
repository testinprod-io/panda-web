import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ChatMessage } from "@/app/types";
import { copyToClipboard } from "@/app/utils"; // Adjust path
import Locale from "@/app/locales"; // Adjust path
import { MultimodalContent } from "@/app/client/api";

import { ChatAction } from "@/app/components/chat/ChatAction";
import { LoadingAnimation } from "@/app/components/common/LoadingAnimation";

// MUI Imports
import { TextField, Button, Box, IconButton, Typography } from "@mui/material"; // IconButton not used
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ModeEditRoundedIcon from "@mui/icons-material/ModeEditRounded";

import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"; // For expand/collapse
import ChevronRightIcon from "@mui/icons-material/ChevronRight"; // For expand/collapse

import styles from "./chat.module.scss";
import { UUID } from "crypto";

const Markdown = dynamic(async () => (await import("../markdown")).Markdown, {
  loading: () => <LoadingAnimation />,
});

interface ChatMessageCellProps {
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

  const { role, content, reasoning, streaming, isError, isReasoning } = message;

  const handleResend = useCallback(
    () => onResend(messageId),
    [onResend, messageId]
  );
  const handleUserStop = useCallback(
    () => onUserStop(messageId),
    [onUserStop, messageId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(true);

  const isUser = role === "user";

  const currentTextContent = getTextContent(content);
  const currentImageUrls = getImageUrls(content);
  const currentReasoningText = getReasoningText(reasoning);

  // Ref to store the previous value of message.isReasoning
  const prevIsReasoningRef = React.useRef(message.isReasoning);

  useEffect(() => {
    if (isEditing) {
      setEditedText(currentTextContent);
    }
  }, [currentTextContent, isEditing]);

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
    setEditedText(currentTextContent);
    setIsEditing(true);
  }, [currentTextContent]);

  const handleCancelClick = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSendClick = useCallback(() => {
    if (editedText.trim() === currentTextContent.trim()) {
      setIsEditing(false);
      return;
    }
    onEditSubmit(messageId, editedText);
    setIsEditing(false);
  }, [messageId, editedText, currentTextContent, onEditSubmit]);

  const toggleReasoningCollapse = useCallback(() => {
    setIsReasoningCollapsed((prev) => !prev);
  }, []);

  if (isError) {
    return (
      <div className={clsx(styles["chat-message"])}>
        <div className={styles["chat-message-container"]}>
        <div className={styles["chat-message-actions"]}>
          <div className={styles["chat-input-actions"]}>
            <ChatAction
              text={null}
              icon={<ReplayRoundedIcon sx={{ fontSize: "20px" }} />}
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

  const showReasoning = !isUser && (currentReasoningText || isReasoning);

  return (
    <div
      className={clsx(
        styles["chat-message"],
        isUser && styles["chat-message-user"],
        (streaming || isReasoning) && styles["chat-message-streaming"]
      )}
    >
      <div className={styles["chat-message-container"]}>
        <div className={styles["chat-message-header"]}>
          <div className={styles["chat-message-avatar"]}></div>
        </div>
        {showActions && !isEditing && (
          <div className={styles["chat-message-actions"]}>
            <div className={styles["chat-input-actions"]}>
              {!(streaming || isReasoning) && (
                <>
                  {!isUser && (
                    <>
                      <ChatAction
                        text={null}
                        icon={<ReplayRoundedIcon sx={{ fontSize: "20px" }} />}
                        onClick={handleResend}
                        disabled={isChatLoading}
                      />
                      <ChatAction
                        text={null}
                        icon={
                          <ContentCopyRoundedIcon sx={{ fontSize: "20px" }} />
                        }
                        onClick={() =>
                          copyToClipboard(
                            currentTextContent +
                              (currentReasoningText
                                ? `\n\n[Reasoning]:\n${currentReasoningText}`
                                : "")
                          )
                        }
                        disabled={isChatLoading}
                      />
                    </>
                  )}
                  {isUser && (
                    <>
                      <ChatAction
                        text={null}
                        icon={<ModeEditRoundedIcon sx={{ fontSize: "20px" }} />}
                        onClick={handleEditClick}
                        disabled={isChatLoading}
                      />
                      <ChatAction
                        text={null}
                        icon={
                          <ContentCopyRoundedIcon sx={{ fontSize: "20px" }} />
                        }
                        onClick={() => copyToClipboard(currentTextContent)}
                        disabled={isChatLoading}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <div className={styles["chat-message-item"]}>
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
                {isReasoning && !currentReasoningText && (
                  <Box sx={{ ml: 1 }}>
                    <LoadingAnimation />
                  </Box>
                )}
              </Box>
              {!isReasoningCollapsed && currentReasoningText && (
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
                    content={currentReasoningText}
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
              {(currentTextContent ||
                currentImageUrls.length > 0 ||
                (streaming && !isReasoning && !showReasoning)) && (
                <Markdown
                  key={`${messageId}-${streaming ? "streaming" : "done"}-${
                    isReasoning ? "reasoning" : "content"
                  }`}
                  content={currentTextContent}
                  loading={
                    streaming &&
                    !isUser &&
                    currentTextContent.length === 0 &&
                    !isReasoning
                  }
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  defaultShow={index >= renderMessagesLength - 6}
                />
              )}
              {currentImageUrls.map((image, imgIndex) => (
                <Image
                  key={imgIndex}
                  className={styles["chat-message-item-image"]}
                  src={image}
                  alt={`attached image ${imgIndex + 1}`}
                  width={300}
                  height={300}
                  style={{ objectFit: "contain", marginTop: "10px" }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
