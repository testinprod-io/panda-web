"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/sdk/hooks";
import { usePandaSDK } from "@/providers/sdk-provider";
import Locale from "@/locales";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useEncryption } from "@/providers/encryption-provider";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 20;

interface CreatePasswordStepProps {
  onNext: () => void;
}

export default function CreatePasswordStep({ onNext }: CreatePasswordStepProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const { sdk } = usePandaSDK();
  const { encryptedId } = useAuth();
  const isFirstTimeUser = sdk.ready ? encryptedId === null : null;
  const { user, logout, ready, authenticated } = usePrivy();
  const { createPassword, unlockApp } = useEncryption();


  useEffect(() => {
    // This logic might be handled in the parent `OnboardingView` in the future.
    // For now, it mirrors the original page's behavior.
    if (isFirstTimeUser === false && confirmPassword.length === 0) {
      // In a real scenario, we might skip this step.
      // For now, we proceed.
    }
  }, [ready, authenticated, isFirstTimeUser]);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);

    if (newPassword && (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH)) {
      setPasswordError(Locale.Onboarding.Encryption.PasswordLengthMismatch(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH));
    } else {
      setPasswordError("");
    }
    
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmPasswordError(Locale.Onboarding.Encryption.PasswordMismatch);
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = event.target.value;
    setConfirmPassword(newConfirmPassword);

    if (password !== newConfirmPassword) {
      setConfirmPasswordError(Locale.Onboarding.Encryption.PasswordMismatch);
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () =>
    setShowConfirmPassword((show) => !show);

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };
  const handleSubmitForm = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      let hasError = false;
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        setPasswordError(Locale.Onboarding.Encryption.PasswordLengthMismatch(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH));
        hasError = true;
      } else {
        setPasswordError("");
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError(Locale.Onboarding.Encryption.PasswordMismatch);
        hasError = true;
      } else {
        setConfirmPasswordError("");
      }

      if (hasError) {
        return;
      }

      try {
        await createPassword(password);
        await unlockApp(password);
        onNext();
      } catch (err: any) {
        setPasswordError(err.message || "Failed to process password");
      }
    },
    [password, confirmPassword, createPassword, unlockApp, onNext],
  );

  const isButtonDisabled =
    !password ||
    !confirmPassword ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    password !== confirmPassword;

  if (!ready || isFirstTimeUser === undefined) {
    return <div></div>;
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
      }}
    >
      <Typography
        variant="body1"
        sx={{
          color: "#131A28",
          fontSize: "16px",
          fontFamily: "Inter, sans-serif",
          fontWeight: "500",
          textAlign: "left",
          width: "100%",
        }}
      >
        {Locale.Onboarding.Encryption.Description}
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmitForm}
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <TextField
          autoFocus
          required
          margin="none"
          id="create-password"
          type={showPassword ? "text" : "password"}
          fullWidth
          variant="outlined"
          value={password}
          onChange={handlePasswordChange}
          error={!!passwordError}
          placeholder={Locale.Onboarding.Encryption.Placeholder(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-input": {
              border: "none",
            },

            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: "white",
              height: "48px",
              fontFamily: "Inter, sans-serif",
              border: "none",
              "&.Mui-focused fieldset": {},
              "&.Mui-error fieldset": { borderColor: "#F33D4F" },
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
            },
            "& .MuiInputBase-input": {
              width: "100% !important",
              padding: "0 14px",
              height: "100%",
              color: "#131A28",
              fontSize: "16px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "400",
              border: "none",
              "&::placeholder": { opacity: 1, color: "#CACACA" },
            },
          }}
        />
        {passwordError && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              fontWeight: "400",
              color: "#F33D4F",
              textAlign: "left",
              width: "100%",
            }}
          >
            {passwordError}
          </Typography>
        )}
        <TextField
          required
          margin="none"
          id="confirm-password"
          type={showConfirmPassword ? "text" : "password"}
          fullWidth
          variant="outlined"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={!!confirmPasswordError}
          placeholder={Locale.Onboarding.Encryption.ConfirmPlaceholder}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowConfirmPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-input": {
              border: "none",
            },

            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: "white",
              height: "48px",
              fontFamily: "Inter, sans-serif",
              border: "none",
              "&.Mui-focused fieldset": {},
              "&.Mui-error fieldset": { borderColor: "#F33D4F" },
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
            },
            "& .MuiInputBase-input": {
              width: "100% !important",
              padding: "0 14px",
              height: "100%",
              color: "#131A28",
              fontSize: "16px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "400",
              border: "none",
              "&::placeholder": { opacity: 1, color: "#CACACA" },
            },
            marginTop: "12px",
          }}
        />
        {confirmPasswordError && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              fontWeight: "400",
              color: "#F33D4F",
              textAlign: "left",
              width: "100%",
            }}
          >
            {confirmPasswordError}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={isButtonDisabled}
          sx={{
            alignSelf: "flex-start",
            height: "48px",
            background: !isButtonDisabled ? "#131A28" : "#F3F3F3",
            color: !isButtonDisabled ? "#C1FF83" : "#CACACA",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "600",
            marginTop: "12px",
            boxShadow: "none",
            "&:hover": {
              background: !isButtonDisabled ? "#131A28" : "#F3F3F3",
              boxShadow: "none",
            },
            "&.Mui-disabled": {
              background: "#F3F3F3",
              color: "#CACACA",
            },
          }}
        >
          {Locale.Onboarding.Encryption.Confirm}
        </Button>
      </Box>
    </Box>
  );
} 