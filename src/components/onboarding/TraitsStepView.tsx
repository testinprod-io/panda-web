"use client";

import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Chip } from "@mui/material";
import { motion } from "framer-motion";
import Locale from "@/locales";

interface Trait {
  id: string;
  label: string;
}

const initialTraits: Trait[] = [
  { id: "chatty", label: "Chatty" },
  { id: "witty", label: "Witty" },
  { id: "straight", label: "Straight shooting" },
  { id: "encouraging", label: "Encouraging" },
  { id: "genz", label: "Gen Z" },
  { id: "skeptical", label: "Skeptical" },
  { id: "traditional", label: "Traditional" },
  { id: "forward", label: "Forward thinking" },
  { id: "poetic", label: "Poetic" },
  { id: "chill", label: "Chill" },
];

interface TraitsStepViewProps {
  placeholder: string;
  onNext: (value: string) => void;
  onSkip: () => void;
  avatarInitial: string;
  initialValue: string;
}

export default function TraitsStepView({
  placeholder,
  onNext,
  onSkip,
  avatarInitial,
  initialValue,
}: TraitsStepViewProps) {
  const [traitsText, setTraitsText] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTraitsText(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const currentTextTraits = new Set(
      traitsText
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    );
    setSelectedTraits(currentTextTraits);
  }, [traitsText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(traitsText);
  };

  const handleTraitToggle = (traitLabel: string) => {
    const newSelectedTraits = new Set(selectedTraits);
    if (newSelectedTraits.has(traitLabel)) {
      newSelectedTraits.delete(traitLabel);
    } else {
      newSelectedTraits.add(traitLabel);
    }
    setTraitsText(Array.from(newSelectedTraits).join(", "));
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
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "500px",
          gap: "1.5rem",
        }}
      >
        <Box
          key="input_container"
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
            value={traitsText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTraitsText(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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
            autoFocus
          />
        </Box>
        <Box
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            width: "100%",
          }}
        >
          {initialTraits.map((trait) => (
            <Chip
              key={trait.id}
              label={trait.label}
              onClick={() => handleTraitToggle(trait.label)}
              sx={{
                borderRadius: "48px",
                border: "1px solid #cacaca",
                borderColor: selectedTraits.has(trait.label) ? "#1976d2" : "#cacaca",
                fontSize: "15px",
                fontWeight: "500",
                lineHeight: "32px",
                padding: "4px 8px",
                backgroundColor: selectedTraits.has(trait.label) ? "#e3f2fd" : "white",
                color: selectedTraits.has(trait.label) ? "#1976d2" : "#1e1e1e",
                "&:hover": {
                  borderColor: "#757575",
                  backgroundColor: "#f5f5f5",
                },
              }}
              variant={selectedTraits.has(trait.label) ? "filled" : "outlined"}
              clickable
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: "1rem" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!traitsText.trim()}
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
