import React from "react";
import { Box, CircularProgress, Tooltip, Typography } from "@mui/material";
import { copyToClipboard } from "@/utils/utils";
import styles from "@/components/chat/chat.module.scss"; // Reusing chat styles
import { AttestationResult } from "@/types/attestation";
import {
  VerificationResult,
  VerificationStatus,
} from "@/hooks/use-attestation-manager";
import { ChallengeResponse } from "@/client/platforms/panda-challenge";

interface MessageActionsBarProps {
  isUser: boolean;
  isChatLoading: boolean;
  // Removed isStreaming and isReasoning as parent ChatMessageCell already checks this for rendering this component
  messageContent: string | null | undefined; // From visibleContent
  reasoningText: string | null | undefined;
  verificationResult: VerificationResult | undefined;
  challengeResponse: ChallengeResponse | undefined;
  onResend: () => void;
  // onEdit?: () => void; // If edit functionality is added back
}

const AttestationInfoPopup: React.FC<{
  verificationResult: VerificationResult;
  challengeResponse: ChallengeResponse;
}> = ({ verificationResult, challengeResponse }) => {
  if (verificationResult.status === VerificationStatus.Pending) {
    return (
      <Box sx={{ p: 1, maxWidth: 300 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ color: "black" }}>
          🔒 Verifying...
        </Typography>
        <Typography
          variant="body2"
          key={"Verifying"}
          sx={{ wordBreak: "break-word", p: "2px", color: "black" }}
        >
          <strong>Panda Server's identity is being verified...</strong>
        </Typography>
        <Typography
        variant="body2"
        key={"ChallengeText"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>Challenge Text:</strong>{" "}
        <a
          href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          {challengeResponse?.challenge}
        </a>
      </Typography>
        <Typography
          variant="body2"
          key={"Certificate Key"}
          sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
        >
          <strong>Certificate Key:</strong>{" "}
          <a
            href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "black" }}
          >
            {verificationResult.publicKey}
          </a>
        </Typography>
      </Box>
    );
  }

  if (verificationResult.status === VerificationStatus.Failed) {
    return (
      <Box sx={{ p: 1, maxWidth: 300 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ color: "black" }}>
          🔒 Verification Failed
        </Typography>
        <Typography
          variant="body2"
          key={"Verifying"}
          sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
        >
          <strong>Panda Server's identity verification failed. Please try again.</strong>
        </Typography>
        <Typography
        variant="body2"
        key={"ChallengeText"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>Challenge Text:</strong>{" "}
        <a
          href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          {challengeResponse?.challenge}
        </a>
      </Typography>
        <Typography
          variant="body2"
          key={"Certificate Key"}
          sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
        >
          <strong>Certificate Key:</strong>{" "}
          <a
            href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "black" }}
          >
            {verificationResult.publicKey}
          </a>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ color: "black" }}>
        🔒Verified secure execution
      </Typography>
      <Typography
        variant="body2"
        key={"AppID"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>AppID:</strong>{" "}
        <a
          href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          {verificationResult.attestationResult?.appId}
        </a>
      </Typography>
      <Typography
        variant="body2"
        key={"AppHash"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>AppHash:</strong>{" "}
        <a
          href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          {verificationResult.attestationResult?.composeHash}
        </a>
      </Typography>
      <Typography
        variant="body2"
        key={"ChallengeText"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>Challenge Text:</strong>{" "}
        <a
          href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          {challengeResponse?.challenge}
        </a>
      </Typography>

      <Typography
        variant="body2"
        key={"Help"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <a
          href="https://www.youtube.com/watch?v=xvFZjo5PgG0"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "black" }}
        >
          <strong>Help?</strong>
        </a>
      </Typography>
    </Box>
  );
};

export const MessageActionsBar: React.FC<MessageActionsBarProps> = ({
  isUser,
  isChatLoading,
  messageContent,
  reasoningText,
  verificationResult,
  challengeResponse,
  onResend,
}) => {
  const contentToCopy = messageContent || "";
  const fullContentToCopy = reasoningText
    ? `${contentToCopy}\\n\\n[Reasoning]:\\n${reasoningText}`
    : contentToCopy;

  let attestationIcon: React.ReactNode = null;
  console.log("MININININ verificationResult:", verificationResult);
  if (verificationResult && challengeResponse) {
    let icon: React.ReactNode = null;

    if (verificationResult.status === VerificationStatus.Pending) {
      console.log(
        "MININININ verificationResult.status:",
        verificationResult.status
      );
      icon = (
        <CircularProgress
          size={16}
          sx={{ color: "black" }}
          className={styles["chat-message-action-button"]}
        />
      );
    } else if (
      verificationResult.status === VerificationStatus.ContractVerified
    ) {
      icon = (
        <img
          alt="Verified"
          src="/icons/shield.svg"
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
      );
    } else if (verificationResult.status === VerificationStatus.Failed) {
      icon = (
        <img
          src="/icons/error.svg"
          alt="Verification Failed"
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
      );
    }

    attestationIcon = (
      <Tooltip
        title={
          <AttestationInfoPopup
            verificationResult={verificationResult}
            challengeResponse={challengeResponse}
          />
        }
        componentsProps={{
          tooltip: {
            sx: {
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              // "& .MuiTooltip-popperInteractive": {
              //   backgroundColor: "white",
              //   borderRadius: "8px",
              //   border: "1px solid #e0e0e0",
              // },
            },
          },
        }}
      >
        <span
          style={{ display: "flex", alignItems: "center" }}
          className={styles["user-action-button"]}
        >
          {icon}
        </span>
      </Tooltip>
    );
  }

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
        {attestationIcon}
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
      {attestationIcon}
    </Box>
  );
};
