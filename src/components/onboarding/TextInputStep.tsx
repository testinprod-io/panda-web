"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { motion } from "framer-motion";

interface TextInputStepProps {
  placeholder: string;
  onNext: (value: string) => void;
  onSkip: () => void;
  avatarInitial: string;
  multiline?: boolean;
  initialValue?: string;
}

export default function TextInputStep({
  placeholder,
  onNext,
  onSkip,
  avatarInitial,
  multiline = false,
  initialValue = "",
}: TextInputStepProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (multiline || inputValue.trim()) {
      onNext(inputValue);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "8px 12px",
            width: "100%",
            boxShadow: isFocused
              ? "0 2px 5px rgba(0, 0, 0, 0.2), 0 0 0 2px #000000"
              : "0 2px 5px rgba(0, 0, 0, 0.2)",
            transition: "box-shadow 0.2s ease-in-out",
          }}
        >
          <Box
            style={{
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
            }}
          >
            {avatarInitial}
          </Box>
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
                if (inputValue.trim()) {
                  onNext(inputValue);
                }
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
        <Box sx={{ display: "flex", gap: "1rem" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!multiline && !inputValue.trim()}
            sx={{
              alignSelf: "flex-start",
              height: "48px",
              backgroundColor: "#131A28",
              color: "#C1FF83",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
              "&:disabled": {
                backgroundColor: "#e0e0e0",
              },
            }}
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={onSkip}
            sx={{
              alignSelf: "flex-start",
              height: "48px",
              color: "#8a8a8a",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
            }}
          >
            Skip
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
}