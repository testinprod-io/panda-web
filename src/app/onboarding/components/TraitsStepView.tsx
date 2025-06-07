"use client";

import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Chip } from "@mui/material";
import { motion } from "framer-motion";
import styles from "../onboarding.module.scss";

function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

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
  avatarInitial: string;
  initialValue: string;
}

export default function TraitsStepView({
  placeholder,
  onNext,
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
        .filter(Boolean),
    );
    setSelectedTraits(currentTextTraits);
  }, [traitsText]);

  const onNextClick = () => {
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
            value={traitsText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTraitsText(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onNextClick();
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
        <Box className={styles.traitsContainer}>
          {initialTraits.map((trait) => (
            <Chip
              key={trait.id}
              label={trait.label}
              onClick={() => handleTraitToggle(trait.label)}
              className={clsx(
                styles.traitChip,
                selectedTraits.has(trait.label) && styles.selectedTrait,
              )}
              variant={selectedTraits.has(trait.label) ? "filled" : "outlined"}
              clickable
            />
          ))}
        </Box>
        <Button
          type="submit"
          variant="contained"
          onClick={onNextClick}
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
          // className={styles.sendButton}
        >
          Continue
        </Button>
      </Box>
    </motion.div>
  );
}