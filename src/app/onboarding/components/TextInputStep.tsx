"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { motion } from "framer-motion";
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
  const [isFocused, setIsFocused] = useState(false);

  const onNextClick = () => {
    if (multiline || inputValue.trim()) {
      onNext(inputValue);
      setInputValue("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Box className={styles.content}>
        <Box
          className={`${styles.inputContainer} ${
            isFocused ? styles.inputContainerFocused : ""
          }`}
        >
          <Box className={styles.avatar}>{avatarInitial}</Box>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInputValue(e.target.value)
            }
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" && !e.shiftKey && !multiline) {
                e.preventDefault();
                onNextClick();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#1E1E1E",
                fontSize: "1rem",
                "& fieldset": {
                  border: "none",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "#8a8a8a",
              },
              "& .MuiOutlinedInput-input": {
                border: "none",
              },
            }}
            multiline={multiline}
            rows={multiline ? 4 : 1}
            autoFocus
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          onClick={onNextClick}
          disabled={!multiline && !inputValue.trim()}
          sx={{
            alignSelf: "flex-start",
            height: "48px",
            backgroundColor: "#131A28",
            color: "#C1FF83",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
          }}
          // className={styles.sendButton}
        >
          Continue
        </Button>
      </Box>
    </motion.div>
  );
}