"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
} from "@mui/material";
import {
  useLoginWithEmail,
  usePrivy,
  useLoginWithOAuth,
  useLogin,
  User,
  LinkedAccountWithMetadata,
} from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Locale from "@/locales";
import { useAuth } from "@/sdk/hooks";
import { usePandaSDK } from "@/providers/sdk-provider";

interface LoginSignupFormProps {
  mode: "login" | "signup";
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginSignupForm({ mode }: LoginSignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { ready, authenticated } = usePrivy();
  const { sdk } = usePandaSDK();
  const { encryptedId } = useAuth();
  const isFirstTimeUser = sdk.ready ? encryptedId === null : null;

  useEffect(() => {
    return () => {
      setEmail("");
      setSubmittedEmail("");
      setCode("");
    };
  }, []);

  const onComplete = ({
    isNewUser,
  }: {
    user: User;
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: string | null;
    loginAccount: LinkedAccountWithMetadata | null;
  }) => {
    if (isNewUser) {
      router.push("/onboarding");
    } else {
      router.replace("/");
    }
  };

  const onError = (error: any) => {
    if (!error) {
      return;
    }

    if (error.includes("invalid_credentials")) {
      setCode("");
      toast.dismiss();
      toast.error("Please try again.");
    } else if (!error.includes("exited_auth_flow")) {
      toast.dismiss();
      toast.error(error);
    }
  };

  const {
    state: emailState,
    sendCode,
    loginWithCode,
  } = useLoginWithEmail({ onComplete, onError });

  const { initOAuth, state: oauthState } = useLoginWithOAuth({
    onComplete,
    onError,
  });
  const { login } = useLogin({ onComplete, onError });

  useEffect(() => {
    if (sdk.ready && authenticated) {
      if (isFirstTimeUser === undefined) {
        return;
      }

      if (
        window.location.pathname.includes("signup") &&
        isFirstTimeUser === true
      ) {
        router.push("/onboarding");
      } else {
        router.replace("/");
      }
    }
  }, [ready, authenticated, router, isFirstTimeUser, encryptedId, sdk.ready]);

  const isCodeEntryVisible =
    emailState.status === "awaiting-code-input" &&
    email.toLowerCase() === submittedEmail.toLowerCase();

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isCodeEntryVisible) {
        loginWithCode({ code });
      } else {
        if (isValidEmail(email)) {
          setSubmittedEmail(email);
          sendCode({ email, disableSignup: false });
        }
      }
    },
    [isCodeEntryVisible, loginWithCode, code, email, sendCode, mode]
  );

  const handleGoogleLogin = useCallback(async () => {
    initOAuth({ provider: "google" });
  }, [initOAuth]);

  const handleWalletLogin = useCallback(async () => {
    login({ loginMethods: ["wallet"] });
  }, [login]);

  const isSendingCode = emailState.status === "sending-code";
  const isSubmittingCode = emailState.status === "submitting-code";
  const isOauthLoading = oauthState.status === "loading";

  const title = mode === "signup" ? Locale.Signup.Title : Locale.SignIn.Title;
  const switchLinkHref = mode === "login" ? "/signup" : "/login";

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
        justifyContent: "flex-start",
        minHeight: "100vh",
        bgcolor: "background.paper",
        py: 4,
        px: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          maxWidth: "410px",
          marginRight: "auto",
          mb: 10,
        }}
      >
        <Box
          sx={{
            display: "block",
            ".dark &": {
              display: "none",
            },
          }}
        >
          <Image
            src="/icons/inverse-icon.svg"
            alt="Panda AI Logo"
            width={40}
            height={40}
          />
        </Box>
        <Box
          sx={{
            display: "none",
            ".dark &": {
              display: "block",
            },
          }}
        >
          <Image
            src="/icons/icon-white.svg"
            alt="Panda AI Logo"
            width={40}
            height={40}
          />
        </Box>
        <Typography
          fontSize="24px"
          fontWeight="600"
          color="var(--text-primary)"
          marginLeft="12px"
        >
          Panda
        </Typography>
      </Box>
      <Box sx={{ width: "100%", maxWidth: "410px", marginTop: "10vh" }}>
        <Box sx={{ textAlign: "left", mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: "600" }}>
            {title}
          </Typography>
        </Box>

        <form onSubmit={handleEmailSubmit}>
          <Typography variant="body2" sx={{ fontWeight: "500", mb: 1 }}>
            {Locale.Signup.Email}
          </Typography>
          <TextField
            type="email"
            fullWidth
            placeholder={Locale.Signup.Placeholder}
            value={email}
            size="medium"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSendingCode || isSubmittingCode || isOauthLoading}
            inputProps={{
              style: { fontSize: "14px", height: "40px", padding: "0px 10px" },
            }}
            sx={{
              mb: 2,
              alignItems: "left",
              "& .MuiInputBase-input": { textAlign: "left", border: "none" },
            }}
          />

          {isCodeEntryVisible && (
            <>
              <Typography variant="body2" sx={{ fontWeight: "500", mb: 1 }}>
                {Locale.Signup.VerificationCode}
              </Typography>
              <TextField
                type="text"
                fullWidth
                placeholder={Locale.Signup.VerificationCodePlaceholder}
                value={code}
                size="medium"
                inputProps={{ style: { fontSize: "14px", height: "40px" } }}
                onChange={(e) => setCode(e.target.value)}
                disabled={isSubmittingCode || isOauthLoading}
                sx={{
                  mb: 2,
                  alignItems: "left",
                  "& .MuiInputBase-input": {
                    backgroundColor: "transparent",
                    textAlign: "left",
                    height: "20px",
                    border: "none",
                  },
                }}
              />
            </>
          )}

          {mode === "signup" && isCodeEntryVisible && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {Locale.Signup.TermsOfService1}{" "}
                  <MuiLink
                    component={Link}
                    href="/terms"
                    sx={{ textDecoration: "underline", color: "text.primary" }}
                  >
                    {Locale.Signup.TermsOfService2}
                  </MuiLink>
                  {` ${Locale.Signup.TermsOfService3} `}
                  <MuiLink
                    component={Link}
                    href="/privacy"
                    sx={{ textDecoration: "underline", color: "text.primary" }}
                  >
                    {Locale.Signup.TermsOfService4}
                  </MuiLink>
                </Typography>
              }
              sx={{ mt: 2, alignItems: "center" }}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{
              mt: 2,
              py: 1.5,
              textTransform: "none",
              fontSize: "1rem",
              backgroundColor: "#FFFFFF",
              color: "#000000",
              borderRadius: 2,
              "&:hover": { color: "#FFFFFF", backgroundColor: "#1E1E1E" },
            }}
            disabled={
              isSendingCode ||
              isSubmittingCode ||
              isOauthLoading ||
              (isCodeEntryVisible
                ? (mode === "signup" && !agreedToTerms) || code.length !== 6
                : !isValidEmail(email))
            }
          >
            {isSendingCode || isSubmittingCode ? (
              <CircularProgress size={24} color="inherit" />
            ) : isCodeEntryVisible ? (
              mode === "signup" ? (
                Locale.Signup.Submit
              ) : (
                Locale.SignIn.Submit
              )
            ) : (
              Locale.Signup.Continue
            )}
          </Button>
        </form>

        <Divider
          sx={{ my: 4, "&::before, &::after": { borderColor: "grey.300" } }}
        >
          <Typography variant="body2" color="text.secondary">
            {Locale.Signup.OrContinueWith}
          </Typography>
        </Divider>

        <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={isOauthLoading || isSendingCode || isSubmittingCode}
            startIcon={
              <Image
                src="/icons/google.svg"
                alt="Google"
                width={18}
                height={18}
              />
            }
            sx={{
              textTransform: "none",
              justifyContent: "center",
              py: 1.5,
              fontSize: "1rem",
              borderColor: "grey.300",
              color: "text.primary",
              borderRadius: 2,
            }}
          >
            Google
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleWalletLogin}
            disabled={isOauthLoading || isSendingCode || isSubmittingCode}
            startIcon={
              <Image
                src="/icons/placeholder.svg"
                alt="Wallet"
                width={20}
                height={20}
              />
            }
            sx={{
              textTransform: "none",
              justifyContent: "center",
              py: 1.5,
              fontSize: "1rem",
              borderColor: "grey.300",
              color: "text.primary",
              borderRadius: 2,
            }}
          >
            Wallet
          </Button>
        </Box>
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {`${mode === "signup" ? Locale.SignIn.AlreadyHaveAccount : Locale.Signup.DontHaveAccount} `}
            <MuiLink
              component={Link}
              href={switchLinkHref}
              sx={{
                textDecoration: "underline",
                color: "text.primary",
                fontWeight: 500,
              }}
            >
              {mode === "signup" ? Locale.SignIn.Title : Locale.Signup.Title}
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
