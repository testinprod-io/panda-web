"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  useLoginWithEmail,
  usePrivy,
  useLoginWithGoogle,
  useLoginWithWallet,
} from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LoginSignupFormProps {
  mode: "login" | "signup";
}

export default function LoginSignupForm({ mode }: LoginSignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const { ready, authenticated } = usePrivy();

  const onComplete = (
    user: any,
    isNewUser: boolean,
    wasAlreadyAuthenticated: boolean,
  ) => {
    if (isNewUser) {
      router.push("/signup?step=password");
    } else {
      router.push("/");
    }
  };

  const {
    state: emailState,
    sendCode,
    loginWithCode,
  } = useLoginWithEmail({
    onComplete,
    onError: (error) => {
      console.error(error);
      // You can add user-facing error handling here
    },
  });

  const { login: loginWithGoogle } = useLoginWithGoogle({
    onComplete,
    onError: (error) => console.error(error),
  });

  const { login: loginWithWallet } = useLoginWithWallet({
    onComplete,
    onError: (error) => console.error(error),
  });

  useEffect(() => {
    if (ready && authenticated) {
        if(window.location.pathname.includes('signup')) {
            router.push('/signup?step=password');
        } else {
            router.push("/");
        }
    }
  }, [ready, authenticated, router]);

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (emailState.status === "initial" || emailState.status === "error") {
        sendCode({ email });
      } else if (emailState.status === "awaiting-code-input") {
        loginWithCode({ code });
      }
    },
    [email, code, emailState.status, sendCode, loginWithCode],
  );

  const isSendingCode = emailState.status === "sending-code";
  const isSubmittingCode = emailState.status === "submitting-code";
  const isCodeEntryVisible = emailState.status === "awaiting-code-input";

  const title = mode === "login" ? "Log In to Panda" : "Create your account";
  const switchLinkHref = mode === "login" ? "/signup" : "/login";
  const switchLinkText =
    mode === "login"
      ? "Don't have an account? Sign Up"
      : "Already have an account? Log In";

  if (!ready) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 2,
        background:
          "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "400px",
          p: 4,
          boxShadow: 3,
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Image
            src="/icons/rounded-logo.svg"
            alt="Panda AI Logo"
            width={64}
            height={64}
          />
          <Typography variant="h5" component="h1" sx={{ mt: 2 }}>
            {title}
          </Typography>
        </Box>

        <form onSubmit={handleEmailSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isCodeEntryVisible || isSendingCode || isSubmittingCode}
          />

          {isCodeEntryVisible && (
            <TextField
              label="Verification Code"
              type="text"
              fullWidth
              margin="normal"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSubmittingCode}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 2 }}
            disabled={isSendingCode || isSubmittingCode}
          >
            {isSendingCode || isSubmittingCode ? (
              <CircularProgress size={24} color="inherit" />
            ) : isCodeEntryVisible ? (
              "Verify Code"
            ) : (
              "Continue with Email"
            )}
          </Button>
        </form>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => loginWithGoogle()}
            startIcon={
              <Image
                src="/icons/google-logo.svg"
                alt="Google"
                width={20}
                height={20}
              />
            }
          >
            Continue with Google
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => loginWithWallet()}
            startIcon={
              <Image
                src="/icons/wallet-logo.svg"
                alt="Wallet"
                width={20}
                height={20}
              />
            }
          >
            Continue with Wallet
          </Button>
        </Box>
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Link href={switchLinkHref} passHref>
            <Typography
              component="a"
              sx={{ textDecoration: "none", color: "primary.main" }}
            >
              {switchLinkText}
            </Typography>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}