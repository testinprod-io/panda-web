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
    <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      minHeight: "100vh",
      width: "100%",
      // bgcolor: 'background.paper',
      py: 4,
      px: 2,
    }}
  >
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: '410px', marginRight: 'auto', mb: 10 }}>
        <img src="/icons/inverse-icon.png" alt="Panda AI Logo" width={40} height={40} />
        <Typography fontSize="24px" fontWeight="600" color="#131A28" marginLeft="12px">
            Panda AI
          </Typography>
        </Box>

    <Box className={styles.content}>
      <img src="/icons/panda.svg" alt="Panda" width={60} height={60} />
      <Typography variant="h6" align="left" className={styles.question}>
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
            "& .MuiInput-input": {
              border: "none",
            },
          }}
          // InputProps={{
          //   disableUnderline: true,
          // }}
          autoFocus
        />
        <Button
          onClick={onNextClick}
          disabled={!inputValue.trim()}
          className={styles.sendButton}
        >
          <img src="/icons/arrow-up.svg" alt="Arrow Up" width={24} height={24} />
        </Button>
      </Box>
      </Box>
    </Box>
  );
}