"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import Locale from "@/locales";
import { EncryptionService } from "@/services/encryption-service";

const TEXT_TO_ANIMATE = Locale.Onboarding.Encryption.PasswordCreatedDescription;

export default function PasswordConfirmation() {
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [isButtonHidden, setIsButtonHidden] = useState(true);

  const base64Text = useMemo(() => {
    return EncryptionService.encrypt(TEXT_TO_ANIMATE);
  }, []);

  useEffect(() => {
    const words = TEXT_TO_ANIMATE;
    let currentWordIndex = 0;

    const intervalId = setInterval(() => {
      if (currentWordIndex < words.length) {
        const char = words[currentWordIndex];
        setDisplayedText((prev) => prev + char);
        currentWordIndex++;
      } else {
        clearInterval(intervalId);
        setTimeout(() => setIsEncrypting(true), 1000); // Wait 1s before starting encryption
      }
    }, 20);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isEncrypting) return;

    const maxLen = Math.max(TEXT_TO_ANIMATE.length, base64Text.length);
    if (encryptionProgress < maxLen) {
      const timer = setTimeout(() => {
        setEncryptionProgress((prev) => prev + 1);
      }, 20); // Speed of encryption effect
      return () => clearTimeout(timer);
    } else {
        setIsButtonHidden(false);
    }
  }, [isEncrypting, encryptionProgress, router, base64Text, TEXT_TO_ANIMATE]);

  const animatedText = useMemo(() => {
    if (!isEncrypting) {
      return displayedText;
    }
    return base64Text.substring(0, encryptionProgress) + TEXT_TO_ANIMATE.substring(encryptionProgress);
  }, [isEncrypting, encryptionProgress, displayedText, base64Text, TEXT_TO_ANIMATE]);

  const onContinue = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: '100vh',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: '410px', marginRight: 'auto', mb: 10 }}>
        <img src="/icons/inverse-icon.svg" alt="Panda AI Logo" width={40} height={40} />
        <Typography fontSize="24px" fontWeight="600" color="#131A28" marginLeft="12px">
          Panda
        </Typography>
      </Box>
      <Box
        sx={{
          width: "100%",
          maxWidth: "500px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "left",
            gap: "12px",
            marginTop: "15vh",
          }}
        >
          <Typography
            variant="h5"
            component="div"
            sx={{
              color: "#131A28",
              fontSize: "24px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "600",
              textAlign: "left"
            }}
          >
            {Locale.Onboarding.Encryption.PasswordCreatedTitle}
          </Typography>

        <Typography
          variant="h5"
          component="div"
          sx={{
            color: "#131A28",
            fontSize: "16px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "500",
            textAlign: "left",
            marginTop: "24px",
            lineHeight: "1.5",
            minHeight: '108px', // To prevent layout shift (24 * 1.5 * 3 lines)
            maxWidth: '500px',
            overflowWrap: 'break-word',
            // wordBreak: 'breakword'
          }}
        >
          {animatedText}
        </Typography>
      

      <Button
            type="button"
            variant="contained"
            onClick={onContinue}
            // hidden={isButtonHidden}
            sx={{
              opacity: isButtonHidden ? "0" : "1",
              transition: "opacity 0.5s ease-in-out",
              alignSelf: "flex-start",
              height: "48px",
              background: "#131A28",
              color: "#C1FF83",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "16px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "600",
            //   marginTop: "12px",
              boxShadow: "none",
              "&:hover": {
                background: "#131A28",
                boxShadow: "none",
              },
            }}
          >
            {Locale.Onboarding.Encryption.Continue}
          </Button>
        </Box>
      </Box>
    </Box>
  );
} 