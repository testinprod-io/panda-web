"use client";

import { Box, Typography } from "@mui/material";

export default function NewChatPage() {
  // This page now just renders the Welcome content.
  // The surrounding layout (app/chat/layout.tsx) will handle the gradient,
  // positioning of this content, the ChatInputPanel, and the "Terms" text
  // when on the new chat route.
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        // Removed height, justifyContent, p, and background from here,
        // as these will be controlled by the layout for the new chat page view.
      }}
    >
      <img
        style={{ width: 48, height: 45 }} // Added marginBottom for spacing
        src="/icons/panda.svg"
        alt="Panda AI Logo"
      />
      <Typography
        // variant="h2" // Keep variant for semantics, but override styles
        gutterBottom // Keep for some spacing, or manage explicitly
        sx={{
          color: "#131A28", // Figma style
          fontSize: "32px", // Figma style
          fontWeight: "600", // Figma style
          lineHeight: "38.74px", // Figma style
          margin: "0px",
          // Removed original fontSize, fontWeight, color
        }}
      >
        Welcome,
      </Typography>
      <Typography // New Typography for the second line
        sx={{
          color: "#131A28", // Figma style
          fontSize: "32px", // Figma style
          fontWeight: "400", // Figma style
          lineHeight: "38.74px", // Figma style
        }}
      >
        What can I help with?
      </Typography>
    </Box>
  );
}
