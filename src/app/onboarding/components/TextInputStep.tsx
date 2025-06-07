"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import styles from "../onboarding.module.scss";

interface TextInputStepProps {
  placeholder: string;
  onNext: (value: string) => void;
  avatarInitial: string;
  multiline?: boolean;
  initialValue?: string;
}

export default function TextInputStep({
  placeholder,
  onNext,
  avatarInitial,
  multiline = false,
  initialValue = "",
}: TextInputStepProps) {
  const [inputValue, setInputValue] = useState(initialValue);

  const onNextClick = () => {
    if (multiline || inputValue.trim()) {
      onNext(inputValue);
    }
  };

  return (
    <Box className={styles.inputContainer}>
      <Box className={styles.avatar}>{avatarInitial}</Box>
      <TextField
        fullWidth
        variant="standard"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setInputValue(e.target.value)
        }
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" && !e.shiftKey && !multiline) {
            e.preventDefault();
            onNextClick();
          }
        }}
        sx={{
          "& .MuiInput-root": {
            color: "#1E1E1E",
            fontSize: "1rem",
          },
          "& .MuiInput-input::placeholder": {
            color: "#8a8a8a",
          },
          "& .MuiInput-input": {
            border: "none",
          },
        }}
        multiline={multiline}
        rows={multiline ? 4 : 1}
        autoFocus
      />
      <Button
        onClick={onNextClick}
        disabled={!multiline && !inputValue.trim()}
        className={styles.sendButton}
      >
        <img src="/icons/arrow-up.svg" alt="Arrow Up" width={24} height={24} />
      </Button>
    </Box>
  );
}