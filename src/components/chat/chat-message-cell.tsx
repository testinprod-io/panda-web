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
import { FilePreviewItem } from "./FilePreviewItem";
import { MessageActionsBar } from "./MessageActionsBar";
import { ReasoningDisplay } from "./ReasoningDisplay";
import { EditMessageForm } from "./EditMessageForm";

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

  const { role, streaming, isError, isReasoning, files, visibleContent: content, visibleReasoning: reasoning, reasoningTime } =
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
  const handleUserStop = useCallback(() => onUserStop(messageId), [onUserStop, messageId]);

  const [isEditing, setIsEditing] = useState(false);

  const isUser = role === "user";

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditConfirm = useCallback((newText: string) => {
    if (typeof content !== 'string') { 
      setIsEditing(false);
      return; 
    }
    onEditSubmit(messageId, newText);
    setIsEditing(false);
  }, [messageId, content, onEditSubmit]);

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

  const shouldShowReasoning = !isUser && (reasoning || isReasoning);
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

          {showActions && !isEditing && !(streaming || isReasoning) && (
            <MessageActionsBar 
              isUser={isUser}
              isChatLoading={isChatLoading}
              messageContent={content}
              reasoningText={reasoning}
              onResend={handleResend} 
            />
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
            {loadedFiles.map((file: LoadedFile) => (
              <FilePreviewItem key={file.id} file={file} />
            ))}
          </Box>
        )}

        <Box className={styles["chat-message-item"]}>
          {shouldShowReasoning && (
            <ReasoningDisplay 
              reasoning={reasoning}
              isReasoningInProgress={isReasoning || false}
              reasoningTime={reasoningTime}
              fontSize={fontSize} 
              fontFamily={fontFamily}
              scrollRef={scrollRef}
            />
          )}

          {isEditing && isUser ? (
            <EditMessageForm 
              initialText={content as string}
              isChatLoading={isChatLoading}
              onConfirm={handleEditConfirm}
              onCancel={handleEditCancel}
            />
          ) : (
            <>
              {(content || (streaming && !isUser && !shouldShowReasoning)) && (
                <Markdown
                  key={`${messageId}-${streaming ? "streaming" : "done"}-${isReasoning ? "reasoning" : "content"}`}
                  content={content as string}
                  loading={streaming && !isUser && content.length === 0 && !isReasoning}
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
