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
import { usePandaSDK } from "@/providers/sdk-provider";

const MODAL_CONFIG = {
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
};

interface PasswordModalProps {
  open: boolean;
  onUnlockSubmit?: (password: string) => Promise<boolean>;
  onCreateSubmit?: (password: string) => void;
  onClose?: () => void;
  initialPassword?: string;
}

export function PasswordModal({
  open,
  onUnlockSubmit,
  onCreateSubmit,
  onClose,
  initialPassword = "",
}: PasswordModalProps) {
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState("");
  const router = useRouter();
  const { sdk } = usePandaSDK();
  const currentConfig = MODAL_CONFIG;

  useEffect(() => {
    if (open) {
      setPassword(initialPassword);
      setError(currentConfig.getDynamicError(initialPassword));
    }
  }, [open, initialPassword, currentConfig]);

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
      
      } catch (err: any) {
        setError(`Error: ${err.message || "Failed to process password"}`);
      }
    },
    [password, onUnlockSubmit, onCreateSubmit, currentConfig],
  );

  const handleLogOut = useCallback(() => {
    sdk.auth.logout().then(() => {
      router.push("/");
    });
  }, [sdk, router]);

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
  const displayedError = error;

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
        sx: {
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          paddingTop: { xs: "24px", sm: "40px" },
          paddingBottom: { xs: "24px", sm: "40px" },
          paddingLeft: { xs: "16px", sm: "86px" },
          paddingRight: { xs: "16px", sm: "86px" },
        },
      }}
    >
      <Box
        sx={{
          width: "min(372px, 90%)",
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
            id={`unlock-password`}
            type="password"
            autoComplete="current-password"
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
        </Box>

        <DialogActions sx={{ padding: 0, width: "100%", marginTop: "8px" }}>
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
    </Dialog>
  );
}
