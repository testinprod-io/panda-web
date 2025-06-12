"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

const TEXT_TO_ANIMATE = "Awesome, from now on, every data you submit will be encrypted using your password.";

export default function PasswordConfirmation() {
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [isButtonHidden, setIsButtonHidden] = useState(true);

  const base64Text = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.btoa(TEXT_TO_ANIMATE);
  }, []);

  useEffect(() => {
    const words = TEXT_TO_ANIMATE;
    let currentWordIndex = 0;

    const intervalId = setInterval(() => {
      if (currentWordIndex < words.length) {
          setDisplayedText((prev) => {
            if (words[currentWordIndex]) {
                return prev ? `${prev}${words[currentWordIndex]}` : words[currentWordIndex]
            }
            return prev;
          });
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: '100vh',
        py: 4,
        px: 2,
        // background: "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)"
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: '410px', position: 'absolute', top: '32px', left: '32px' }}>
        <img src="/icons/inverse-icon.png" alt="Panda AI Logo" width={40} height={40} />
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
        <Typography
          variant="h5"
          component="div"
          sx={{
            color: "#131A28",
            fontSize: "20px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "600",
            textAlign: "left",
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
            Continue
          </Button>
          </Box>
    </Box>
  );
} 