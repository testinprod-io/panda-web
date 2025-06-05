"use client";

import React, { useState, useCallback, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 20;

const MODAL_CONFIG = {
  create: {
    iconSrc: "/icons/rounded-logo.svg",
    iconAlt: "Lock Icon",
    // iconBackgroundColor: "#C1FF83",
    // iconFilter:
    //   "invert(0%) sepia(0%) saturate(23%) hue-rotate(67deg) brightness(104%) contrast(103%)",
    title: "Create Encryption Password",
    description:
      "To protect your chat data, set a password. If you forget it, you'll need to reset the service, which will permanently delete all data",
    submitButtonText: "Confirm",
    textFieldPlaceholder: `Enter ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`,
    getDynamicError: (password: string) => {
      if (
        password &&
        (password.length < MIN_PASSWORD_LENGTH ||
          password.length > MAX_PASSWORD_LENGTH)
      ) {
        return `*Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
      }
      return "";
    },
    validateSubmit: (password: string) => {
      if (!password) return "Password cannot be empty.";
      if (
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
      }
      return null;
    },
    isSubmitDisabled: (password: string, error: string) => {
      return (
        !password ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH ||
        !!error
      );
    },
  },
  unlock: {
    iconSrc: "/icons/rounded-logo.svg",
    iconAlt: "Lock Icon",
    // iconBackgroundColor: "#F33D4F",
    // iconFilter:
    //   "invert(100%) sepia(0%) saturate(7500%) hue-rotate(137deg) brightness(118%) contrast(91%)",
    title: "Unlock Panda",
    description: "Unlock and experience encrypted chat that fully protects your privacy.",
    submitButtonText: "Unlock",
    textFieldPlaceholder: "Password",
    getDynamicError: (_password: string) => "",
    validateSubmit: (password: string) => {
      if (!password) {
        return "Password cannot be empty.";
      }
      return null;
    },
    isSubmitDisabled: (password: string, _error: string) => {
      return !password;
    },
  },
};

interface PasswordModalProps {
  open: boolean;
  modalType: "create" | "unlock";
  onUnlockSubmit?: (password: string) => Promise<boolean>;
  onCreateSubmit?: (password: string) => void;
  onClose?: () => void;
  initialPassword?: string;
  enableKeydownDebugToggle?: boolean;
}

export function PasswordModal({
  open,
  modalType,
  onUnlockSubmit,
  onCreateSubmit,
  onClose,
  initialPassword = "",
  enableKeydownDebugToggle,
}: PasswordModalProps) {
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const router = useRouter();
  const { logout } = usePrivy();
  const currentConfig = MODAL_CONFIG[modalType];

  const actualEnableKeydownDebugToggle =
    enableKeydownDebugToggle ?? modalType === "unlock";

  useEffect(() => {
    if (open) {
      setPassword(initialPassword);
      setError(currentConfig.getDynamicError(initialPassword));
    }
  }, [open, modalType, initialPassword, currentConfig]);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    const dynamicError = currentConfig.getDynamicError(newPassword);
    setError(dynamicError);
  };

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const validationError = currentConfig.validateSubmit(password);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError("");

      try {
        if (modalType === "unlock") {
          if (!onUnlockSubmit) {
            setError("Configuration error: Unlock callback missing.");
            return;
          }
          const success = await onUnlockSubmit(password);
          if (success) {
            setPassword("");
            setError("");
          } else {
            setError("*Incorrect password");
          }
        } else if (modalType === "create") {
          if (!onCreateSubmit) {
            setError("Configuration error: Create callback missing.");
            return;
          }
          onCreateSubmit(password);
        }
      } catch (err: any) {
        setError(`Error: ${err.message || "Failed to process password"}`);
      }
    },
    [password, modalType, onUnlockSubmit, onCreateSubmit, currentConfig],
  );

  const handleLogOut = useCallback(() => {
    router.replace("/");
    logout();
  }, [logout, router]);

  useEffect(() => {
    if (actualEnableKeydownDebugToggle) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.shiftKey && e.altKey && e.key === "D") {
          setDebugMode((prev) => !prev);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [actualEnableKeydownDebugToggle]);

  useEffect(() => {
    if (!open) {
      setPassword(initialPassword); // Reset password when modal closes
      setError(""); // Clear errors when modal closes
    }
  }, [open, initialPassword]);

  const isSubmitButtonDisabled = currentConfig.isSubmitDisabled(
    password,
    error,
  );
  // For 'create' mode, we want to show dynamic error during typing OR the submit validation error.
  // For 'unlock' mode, we just show the error (which is usually '*Incorrect password').
  const displayedError =
    modalType === "create"
      ? currentConfig.getDynamicError(password) || error
      : error;

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={onClose}
      BackdropProps={{
        style: {
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
        },
      }}
      PaperProps={{
        style: {
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          paddingTop: "40px",
          paddingBottom: "40px",
          paddingLeft: "86px",
          paddingRight: "86px",
        },
      }}
    >
      <Box
        sx={{
          width: "372px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <Box
            sx={{
              width: "64px !important",
              height: "64px",
              // borderRadius: "50%",
              // backgroundColor: currentConfig.iconBackgroundColor,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <img
              src={currentConfig.iconSrc}
              alt={currentConfig.iconAlt}
              style={{
                width: "64px",
                height: "64px",
                // marginTop: "6px",
                // filter: currentConfig.iconFilter,
              }}
            />
          </Box>
          <DialogTitle sx={{ textAlign: "center", padding: 0 }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: "#131A28",
                fontSize: "24px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "600",
                wordWrap: "break-word",
              }}
            >
              {currentConfig.title}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ textAlign: "center", padding: 0 }}>
            <Typography
              variant="body1"
              sx={{
                color: "#131A28",
                fontSize: "16px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "400",
                wordWrap: "break-word",
              }}
            >
              {currentConfig.description}
            </Typography>
          </DialogContent>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {displayedError && (
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
              {displayedError}
            </Typography>
          )}
          <TextField
            autoFocus
            required
            margin="none"
            id={`${modalType}-password`}
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={handlePasswordChange}
            error={!!displayedError}
            placeholder={currentConfig.textFieldPlaceholder}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: "white",
                height: "40px",
                fontFamily: "Inter, sans-serif",
                "& fieldset": {
                  borderColor: "#CACACA",
                },
                "&:hover fieldset": {
                  borderColor: "#A0A0A0",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#007AFF",
                },
                "&.Mui-error fieldset": {
                  borderColor: "#F33D4F",
                },
              },
              "& .MuiInputBase-input": {
                width: "100% !important",
                padding: "0 14px",
                height: "100%",
                color: "#131A28",
                fontSize: "16px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "400",
                "&::placeholder": {
                  opacity: 1,
                  color: "#CACACA",
                },
              },
            }}
          />
          <DialogActions sx={{ padding: 0, width: "100%" }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitButtonDisabled}
              fullWidth
              sx={{
                height: "48px",
                background: !isSubmitButtonDisabled ? "#131A28" : "#F3F3F3",
                color: !isSubmitButtonDisabled ? "#C1FF83" : "#CACACA",
                borderRadius: "24px",
                padding: "0 10px",
                textTransform: "none",
                fontSize: "16px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "600",
                boxShadow: "none",
                "&:hover": {
                  background: !isSubmitButtonDisabled ? "#131A28" : "#F3F3F3",
                  boxShadow: "none",
                },
                "&.Mui-disabled": {
                  background: "#F3F3F3",
                  color: "#CACACA",
                },
                marginTop: "12px",
              }}
            >
              {currentConfig.submitButtonText}
            </Button>
          </DialogActions>

          <DialogActions sx={{ padding: 0, width: "100%" }}>
            <Button
              variant="outlined"
              fullWidth
              sx={{
                height: "48px",
                background: "#FFFFFF",
                color: "#131A28",
                borderRadius: "24px",
                borderColor: "#B3B3B3",
                padding: "0 10px",
                textTransform: "none",
                fontColor: "#131A28",
                fontSize: "16px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "400",
                boxShadow: "none",
              }}
              onClick={handleLogOut}
            >
              {"Log out"}
            </Button>
          </DialogActions>
        </Box>
      </Box>
    </Dialog>
  );
}
