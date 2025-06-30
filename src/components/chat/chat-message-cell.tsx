import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ChatMessage } from "@/types";
import { ActionButton } from "@/components/ui/action-button";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import { Box, CircularProgress } from "@mui/material";
import styles from "./chat.module.scss";
import { UUID } from "crypto";
import { useEncryption } from "@/providers/encryption-provider";
import { useLoadedFiles, LoadedFile } from "@/hooks/use-loaded-files";
import { FilePreviewItem } from "../ui/file-preview-item";
import { MessageActionsBar } from "../ui/message-actions-bar";
import { ReasoningDisplay } from "../ui/reasoning-display";
import { EditMessageForm } from "../ui/edit-message-form";
import { useAttestation } from "@/sdk/hooks";
import { usePandaSDK } from "@/providers/sdk-provider";
const Markdown = dynamic(
  async () => (await import("../ui/markdown")).Markdown,
  {
    loading: () => <LoadingAnimation />,
  },
);

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
  onEditSubmit: (messageId: UUID, newText: string) => void;
}

function messagePropsAreEqual(
  prevProps: Readonly<ChatMessageCellProps>,
  nextProps: Readonly<ChatMessageCellProps>,
) {
  if (
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.renderMessagesLength !== nextProps.renderMessagesLength
  ) {
    console.log(`[ChatMessageCell] Comparing messages: ${prevProps.isLoading} ${nextProps.isLoading} ${prevProps.renderMessagesLength} ${nextProps.renderMessagesLength}`);
    return false;
  }

  const prevMsg = prevProps.message;
  const nextMsg = nextProps.message;
  console.log(`[ChatMessageCell] Comparing messages: ${prevMsg.id} ${nextMsg.id} ${prevMsg.visibleContent} ${nextMsg.visibleContent} ${prevMsg.streaming} ${nextMsg.streaming} ${prevMsg.isError} ${nextMsg.isError} ${prevMsg.isReasoning} ${nextMsg.isReasoning} ${prevMsg.visibleReasoning} ${nextMsg.visibleReasoning} ${prevMsg.syncState} ${nextMsg.syncState} ${prevMsg.files?.length} ${nextMsg.files?.length}`);
  console.log(`[ChatMessageCell] Next message: ${nextMsg.visibleContent}`);
  if (
    prevMsg.id !== nextMsg.id ||
    prevMsg.visibleContent !== nextMsg.visibleContent ||
    prevMsg.streaming !== nextMsg.streaming ||
    prevMsg.isError !== nextMsg.isError ||
    prevMsg.isReasoning !== nextMsg.isReasoning ||
    prevMsg.visibleReasoning !== nextMsg.visibleReasoning ||
    prevMsg.syncState !== nextMsg.syncState ||
    prevMsg.files?.length !== nextMsg.files?.length
  ) {
    return false;
  }

  return true;
}

export const ChatMessageCell = React.memo(function ChatMessageCell(
  props: ChatMessageCellProps,
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
    onEditSubmit,
  } = props;

  const {
    role,
    streaming,
    isError,
    isReasoning,
    files,
    visibleContent: content,
    visibleReasoning: reasoning,
    reasoningTime,
    challengeResponse,
  } = message;
  const { isLocked } = useEncryption();
  const { attestationResults, verificationResults } = useAttestation();
  const { sdk } = usePandaSDK();

  const loadedFiles = useLoadedFiles(files, sessionId, isLocked);


  useEffect(() => {
    const doVerify = async (key: string) => {
      // setVerificationResult({
      //   status: VerificationStatus.Pending,
      //   attestationResult: undefined,
      //   publicKey: key,
      // });
      console.log("verifying attestation for publicKeyHex:", key);
      try {
        const attestationResult = await sdk.attestation.verifyAttestation(key);
        const verificationResult = await sdk.attestation.verifyContract(key, attestationResult);
        // setVerificationResult(verificationResult);
      } catch (error) {
        console.log("error verifying attestation for publicKeyHex:", key);
        console.log("error:", error);
        // setVerificationResult({
        //   status: VerificationStatus.Failed,
        //   attestationResult: undefined,
        //   publicKey: key,
        // });
      }
    };

    console.log("challengeResponse:", challengeResponse);
    if (challengeResponse) {
      doVerify(challengeResponse.publicKey);
    }
  }, [sdk, challengeResponse]);

  const handleResend = useCallback(
    () => onResend(messageId),
    [onResend, messageId],
  );

  const [isEditing, setIsEditing] = useState(false);

  const isUser = role === "user";

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleEditConfirm = useCallback(
    (newText: string) => {
      if (typeof content !== "string") {
        setIsEditing(false);
        return;
      }
      onEditSubmit(messageId, newText);
      setIsEditing(false);
    },
    [messageId, content, onEditSubmit],
  );

  if (isError) {
    return (
      <div className={clsx(styles["chat-message"])}>
        <div className={styles["chat-message-container"]}>
          <div
            className={clsx(
              styles["chat-message-item"],
              styles["chat-message-error-bubble"],
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
        (streaming || isReasoning) && styles["chat-message-streaming"],
      )}
    >
      <div className={styles["chat-message-header"]}>
          {!isUser && (streaming ? (
            <div className={styles["chat-message-avatar"]}>
              <CircularProgress size={32} sx={{ color: "var(--icon-primary)" }} />
            </div>
          ) : (
            <div className={styles["chat-message-avatar"]} style={{ backgroundColor: "#020202", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px" }}>
              <img src="/icons/rounded-logo.svg" alt="Panda" style={{ width: "24px", height: "24px" }}/>
            </div>
          ))}
        </div>
      <Box
        className={styles["chat-message-container"]}
        sx={
          isUser
            ? {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.25rem",
              }
            : {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.25rem",
              }
        }
      >
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
                  loading={false}
                  // loading={
                  //   streaming && !isUser && content.length === 0 && !isReasoning
                  // }
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  parentRef={scrollRef as React.RefObject<HTMLDivElement>}
                  defaultShow={index >= renderMessagesLength - 6}
                />
              )}
            </>
          )}
        </Box>
        {showActions && !isEditing && !(streaming || isReasoning) && (
          <MessageActionsBar
            isUser={isUser}
            isChatLoading={isChatLoading}
            messageContent={content}
            reasoningText={reasoning}
            verificationResult={challengeResponse ? verificationResults[challengeResponse.publicKey] : undefined}
            challengeResponse={challengeResponse}
            onResend={handleResend}
          />
        )}
      </Box>
    </div>
  );
});
