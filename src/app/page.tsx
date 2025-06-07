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
        // marginTop: "26.34vh",
        paddingTop: "0px",
      }}
    >
      <Image
        src="/icons/rounded-logo.svg"
        alt="Panda AI Logo"
        width={100}
        height={100}
        // style={{ width: "9.26vh", height: "9.26vh" }}
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
        Panda – AI that never watches back.
      </Typography>
      <Typography
        sx={{
          color: "#131A28",
          fontSize: "32px",
          fontWeight: "400",
          lineHeight: "38.74px",
        }}
      >
        {Locale.NewChat.Title()}
      </Typography>
    </Box>
  );
}
