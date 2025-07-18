"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import Locale from "@/locales";

export default function NewChatPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        paddingTop: "0px",
      }}
    >

      <Box
        sx={{
          width: { xs: 60, md: 100 }, height: { xs: 60, md: 100 },
          display: "block",
          ".dark &": {
            display: "none",
          },
        }}
      >
        <Image
          src="/icons/inverse-icon.svg"
          alt="Panda AI Logo"
          width={100}
          height={100}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
      <Box
        sx={{
          width: { xs: 60, md: 100 }, height: { xs: 60, md: 100 },
          display: "none",
          ".dark &": {
            display: "block",
          },
        }}
      >
        <Image
          src="/icons/icon-white.svg"
          alt="Panda AI Logo"
          width={100}
          height={100}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>
      <Typography
        gutterBottom
        sx={{
          fontSize: { xs: "20px", md: "24px" },
          color: "var(--text-primary)",
          fontWeight: "600",
          lineHeight: "38.74px",
          paddingTop: "1.1vh",
          margin: "0px",
        }}
      >
        Panda – {Locale.Chat.Tagline}
      </Typography>
      <Typography
        sx={{
          color: "var(--text-primary)",
          fontSize: { xs: "20px", md: "24px" },
          fontWeight: "400",
          lineHeight: "38.74px",
        }}
      >
        {Locale.NewChat.Title()}
      </Typography>
    </Box>
  );
}
