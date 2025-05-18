"use client";

import { Box, Typography } from "@mui/material";

export default function NewChatPage() {
  // This page now just renders its content. 
  // app/chat/layout.tsx will provide the surrounding layout including ChatInputPanel.
  return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%", // Ensure it takes full height within its parent container in the layout
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          p: 3,
        }}
      >
        <Typography
          variant="h2"
          gutterBottom
          sx={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          How can I help you today?
        </Typography>
      </Box>
  );
}
