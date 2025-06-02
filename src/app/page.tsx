"use client";

import { Box, Typography } from "@mui/material";

export default function NewChatPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        marginTop: "26.34vh",
        paddingTop: "0px",
      }}
    >
      <img
        style={{ width: "9.26vh", height: "9.26vh" }}
        src="/icons/panda.svg"
        alt="Panda AI Logo"
      />
      <Typography
        gutterBottom
        sx={{
          color: "#131A28",
          fontSize: "32px",
          fontWeight: "600",
          lineHeight: "38.74px",
          paddingTop: "1.1vh",
          margin: "0px",
        }}
      >
        Welcome 🐼
      </Typography>
      <Typography
        sx={{
          color: "#131A28",
          fontSize: "32px",
          fontWeight: "400",
          lineHeight: "38.74px",
        }}
      >
        What can I help with?
      </Typography>
    </Box>
  );
}
