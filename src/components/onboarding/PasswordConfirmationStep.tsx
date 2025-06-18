"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Box, Button, Typography } from "@mui/material";

const TEXT_TO_ANIMATE =
  "Awesome, from now on, every data you submit will be encrypted using your password.";

interface PasswordConfirmationStepProps {
  onStartChat: () => void;
  onCustomize: () => void;
}

export default function PasswordConfirmationStep({
  onStartChat,
  onCustomize,
}: PasswordConfirmationStepProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [isButtonHidden, setIsButtonHidden] = useState(true);

  const base64Text = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.btoa(TEXT_TO_ANIMATE);
  }, []);

  useEffect(() => {
    const words = TEXT_TO_ANIMATE;
    let currentWordIndex = 0;

    const intervalId = setInterval(() => {
      if (currentWordIndex < words.length) {
        const char = words[currentWordIndex];
        setDisplayedText((prev) => prev + char);
        currentWordIndex++;
      } else {
        clearInterval(intervalId);
        setTimeout(() => setIsEncrypting(true), 1000); // Wait 1s before starting encryption
      }
    }, 20);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isEncrypting) return;

    const maxLen = Math.max(TEXT_TO_ANIMATE.length, base64Text.length);
    if (encryptionProgress < maxLen) {
      const timer = setTimeout(() => {
        setEncryptionProgress((prev) => prev + 1);
      }, 20); // Speed of encryption effect
      return () => clearTimeout(timer);
    } else {
      setIsButtonHidden(false);
    }
  }, [isEncrypting, encryptionProgress, base64Text, TEXT_TO_ANIMATE]);

  const animatedText = useMemo(() => {
    if (!isEncrypting) {
      return displayedText;
    }
    return (
      base64Text.substring(0, encryptionProgress) +
      TEXT_TO_ANIMATE.substring(encryptionProgress)
    );
  }, [
    isEncrypting,
    encryptionProgress,
    displayedText,
    base64Text,
    TEXT_TO_ANIMATE,
  ]);

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "left",
        gap: "24px",
      }}
    >
      <Typography
        variant="h5"
        component="div"
        sx={{
          color: "#131A28",
          fontSize: "16px",
          fontFamily: "Inter, sans-serif",
          fontWeight: "500",
          textAlign: "left",
          lineHeight: "1.5",
          minHeight: "108px",
          maxWidth: "500px",
          overflowWrap: "break-word",
        }}
      >
        {animatedText}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: "1rem",
          opacity: isButtonHidden ? "0" : "1",
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        <Button
          type="button"
          variant="contained"
          onClick={onStartChat}
          sx={{
            alignSelf: "flex-start",
            height: "48px",
            background: "#131A28",
            color: "#C1FF83",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "600",
            boxShadow: "none",
            "&:hover": {
              background: "#131A28",
              boxShadow: "none",
            },
          }}
        >
          Start chat
        </Button>
        <Button
          type="button"
          variant="contained"
          onClick={onCustomize}
          sx={{
            alignSelf: "flex-start",
            height: "48px",
            background: "#F3F3F3",
            color: "#131A28",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "600",
            boxShadow: "none",
            "&:hover": {
              background: "#e0e0e0",
              boxShadow: "none",
            },
          }}
        >
          Customize Panda
        </Button>
      </Box>
    </Box>
  );
} 