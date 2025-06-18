"use client";

import { Box, Button, Typography } from "@mui/material";
import { motion } from "framer-motion";

interface InfoStepViewProps {
  text: string;
  onNext: () => void;
}

export default function InfoStepView({ text, onNext }: InfoStepViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Typography
          sx={{
            fontFamily: "Inter",
            fontSize: "1.125rem",
          }}
        >
          {text}
        </Typography>
        <Button
          type="button"
          variant="contained"
          onClick={onNext}
          sx={{
            alignSelf: "flex-start",
            height: "48px",
            backgroundColor: "#131A28",
            color: "#C1FF83",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            px: "20px",
          }}
        >
          Continue
        </Button>
      </Box>
    </motion.div>
  );
} 