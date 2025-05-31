import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import styles from './chat.module.scss'; // Assuming some styles might be reused or new ones added here
import dynamic from 'next/dynamic';

// Dynamically import Markdown to avoid SSR issues if it's client-heavy
const Markdown = dynamic(async () => (await import("../ui/markdown")).Markdown, {
  loading: () => <LoadingAnimation />,
});

interface ReasoningDisplayProps {
  reasoning: string | null | undefined;
  isReasoningInProgress: boolean; // Derived from message.isReasoning
  reasoningTime: number | null | undefined;
  initialCollapsed?: boolean;
  // Props for Markdown rendering
  fontSize: number;
  fontFamily: string;
  scrollRef: React.RefObject<HTMLDivElement | null>; 
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({
  reasoning,
  isReasoningInProgress,
  reasoningTime,
  initialCollapsed = true, // Default to collapsed
  fontSize,
  fontFamily,
  scrollRef,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const prevIsReasoningInProgressRef = useRef(isReasoningInProgress);

  // Effect to auto-expand when reasoning starts, and auto-collapse when it finishes
  useEffect(() => {
    if (isReasoningInProgress && !prevIsReasoningInProgressRef.current) {
      setIsCollapsed(false); // Expand when reasoning starts
    }
    // Optional: Collapse when reasoning finishes, if desired, or let user control it
    // else if (!isReasoningInProgress && prevIsReasoningInProgressRef.current) {
    //   setIsCollapsed(true); // Collapse when reasoning finishes
    // }
    prevIsReasoningInProgressRef.current = isReasoningInProgress;
  }, [isReasoningInProgress]);

  // If initialCollapsed prop changes (e.g. parent wants to control it after mount), reflect it.
  // This might be useful if the parent component has its own logic to decide initial state post-mount.
  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  let statusText = "Processing complete";
  if (isReasoningInProgress) {
    statusText = "Thinking...";
  } else if (reasoningTime && reasoningTime > 0) {
    statusText = `Thought for ${(reasoningTime / 1000).toFixed(1)} seconds`;
  }

  // Do not render if there's no reasoning text and reasoning is not in progress
  if (!reasoning && !isReasoningInProgress) {
    return null;
  }

  return (
    <Box
      className={styles["chat-message-reasoning-container"]} // Ensure this class exists or create it
      sx={{ mb: 1, p: 1, borderRadius: 1, backgroundColor: 'transparent' /* Or a subtle background */ }}
    >
      <Box
        display="flex"
        alignItems="center"
        onClick={toggleCollapse}
        sx={{ cursor: "pointer" }}
      >
        <IconButton size="small" sx={{ mr: 0.5 }}>
          {isCollapsed ? (
            <ChevronRightIcon fontSize="inherit" />
          ) : (
            <ExpandMoreIcon fontSize="inherit" />
          )}
        </IconButton>
        <Typography
          variant="caption"
          sx={{ fontWeight: "medium", color: "text.secondary" }} // Consider theme colors
        >
          {statusText}
        </Typography>
        {isReasoningInProgress && !reasoning && (
          <Box sx={{ ml: 1 }}>
            <LoadingAnimation />
          </Box>
        )}
      </Box>
      {!isCollapsed && reasoning && (
        <Box
          sx={{
            mt: 1,
            pl: 2.5, // Indent for the content
            borderLeft: `2px solid rgba(0,0,0,0.1)`, // Consider theme color for border
            ml: 1.2, // Align with icon center
            color: "text.disabled", // Consider theme color
          }}
        >
          <Markdown
            content={reasoning}
            fontSize={fontSize * 0.85} // Slightly smaller font for reasoning
            fontFamily={fontFamily}
            parentRef={scrollRef}
          />
        </Box>
      )}
    </Box>
  );
};