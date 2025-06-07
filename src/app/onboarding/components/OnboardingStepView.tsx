"use client";

import React, { useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import styles from "../onboarding.module.scss";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

interface OnboardingStepViewProps {
  question: string;
  placeholder: string;
  onNext: (value: string) => void;
  avatarInitial: string;
}

export default function OnboardingStepView({
  question,
  placeholder,
  onNext,
  avatarInitial,
}: OnboardingStepViewProps) {
  const [inputValue, setInputValue] = useState("");

  const onNextClick = () => {
    if (inputValue.trim()) {
      onNext(inputValue);
    }
  };

  return (
    <Box className={styles.content}>
      <Typography variant="h1" className={styles.asterisk}>
        *
      </Typography>
      <Typography variant="h2" className={styles.question}>
        {question}
      </Typography>
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onNextClick();
            }
          }}
          sx={{
            "& .MuiInput-root": {
              color: "#e6e0dc",
              fontSize: "1rem",
            },
            "& .MuiInput-input::placeholder": {
              color: "#8a8a8a",
            },
          }}
          InputProps={{
            disableUnderline: true,
          }}
          autoFocus
        />
        <Button
          onClick={onNextClick}
          disabled={!inputValue.trim()}
          className={styles.sendButton}
        >
          <ArrowUpwardIcon />
        </Button>
      </Box>
    </Box>
  );
}