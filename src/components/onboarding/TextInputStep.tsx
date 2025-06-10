"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { motion } from "framer-motion";

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
      <Box style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "500px",
        gap: "1.5rem",
      }}>
        <Box
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "8px 12px",
          width: "100%",
          boxShadow: isFocused ? "0 2px 5px rgba(0, 0, 0, 0.2), 0 0 0 2px #000000" : "0 2px 5px rgba(0, 0, 0, 0.2)",
          transition: "box-shadow 0.2s ease-in-out",
        }}
        >
          <Box style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "12px",
            fontWeight: "bold",
            fontSize: "1rem",
            color: "#1E1E1E",
          }}>{avatarInitial}</Box>
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
        >
          Continue
        </Button>
      </Box>
    </motion.div>
  );
}