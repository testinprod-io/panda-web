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
      <Image
        src="/icons/inverse-icon.png"
        alt="Panda AI Logo"
        width={100}
        height={100}
      />
      <Typography
        gutterBottom
        sx={{
          color: "#131A28",
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
          color: "#131A28",
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
