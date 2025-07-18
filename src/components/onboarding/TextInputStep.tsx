"use client";

import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { motion } from "framer-motion";
import Locale from "@/locales";

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
            backgroundColor: "var(--bg-primary)",
            borderRadius: "16px",
            padding: "8px 12px",
            width: "100%",
            border: isFocused
              ? "1px solid var(--border-primary)"
              : "1px solid var(--border-secondary)",
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
              color: "var(--text-primary)",
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
                color: "var(--text-primary)",
                fontSize: "1rem",
                "& fieldset": {
                  border: "none",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                color: "var(--text-secondary)",
              },
              "& .MuiOutlinedInput-input": {
                border: "none",
                backgroundColor: "var(--bg-primary)",
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
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-disabled)",
              },
            }}
          >
            {Locale.Onboarding.Continue}
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
            {Locale.Onboarding.Skip}
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
}
