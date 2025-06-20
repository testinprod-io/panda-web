"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import Locale from "@/locales";
import { useChatStore } from "@/store/chat";
import { useEffect } from "react";

export default function NewChatPage() {
  const store = useChatStore();

  useEffect(() => {
    store.setCurrentSessionIndex(-1);
  }, []);

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
      <Image
        src="/icons/inverse-icon.svg"
        alt="Panda AI Logo"
        width={100}
        height={100}
      />
      <Typography
        gutterBottom
        sx={{
          color: "var(--text-primary)",
          fontSize: "24px",
          fontWeight: "600",
          lineHeight: "38.74px",
          paddingTop: "1.1vh",
          margin: "0px",
        }}
      >
        Panda – AI that never watches back.
      </Typography>
      <Typography
        sx={{
          color: "var(--text-primary)",
          fontSize: "24px",
          fontWeight: "400",
          lineHeight: "38.74px",
        }}
      >
        {Locale.NewChat.Title()}
      </Typography>
    </Box>
  );
}
