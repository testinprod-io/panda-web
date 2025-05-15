"use client";

import React, { useState, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface CreatePasswordModalProps {
  open: boolean;
  onCreate: (password: string) => void; // Callback when password is created
  onClose: () => void; // Callback to close the modal if needed (e.g. on escape, though disableEscapeKeyDown is used)
}

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 20;

export function CreatePasswordModal({
  open,
  onCreate,
  onClose,
}: CreatePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (error) {
      setError(""); // Clear error when typing
    }
  };

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        setError(
          `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
        );
        return;
      }
      onCreate(password);
    },
    [password, onCreate]
  );

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm" // Adjusted maxWidth for potentially wider content from Figma (width: 448 for text block)
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
          borderRadius: "8px", // Figma: borderRadius: 8
          paddingTop: "40px", // New top padding
          paddingBottom: "40px", // New bottom padding
          paddingLeft: "46px", // New left padding
          paddingRight: "46px", // New right padding
        },
      }}
    >
      {/* Main content flex container */}
      <Box
        sx={{
          width: "448px",
          margin: "0 auto",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title and Paragraph Block */}
        <Box
          sx={{
            width: "100%",
            display: "block",
            flexDirection: "column",
            alignItems: "center",
            gap: "40px",
            marginBottom: "24px",
          }}
        >
          <DialogTitle sx={{ textAlign: "center", padding: 0 }}>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: "#131A28", // Figma: color: '#131A28'
                fontSize: "24px", // Figma: fontSize: 24
                fontFamily: "Inter, sans-serif",
                fontWeight: "600", // Figma: fontWeight: '600'
                wordWrap: "break-word",
                marginBottom: "24px",
              }}
            >
              Create Encryption Password
            </Typography>
          </DialogTitle>
          <DialogContent
            sx={{ textAlign: "center", padding: 0, width: "100%" }}
          >
            <Typography
              variant="body1"
              sx={{
                color: "#131A28", // Figma: color: '#131A28'
                fontSize: "16px", // Figma: fontSize: 16
                fontFamily: "Inter, sans-serif",
                fontWeight: "400", // Figma: fontWeight: '400'
                wordWrap: "break-word",
              }}
            >
              To protect your chat data, please set a password. <br />
              If you forget it, you'll need to reset the service, which will
              permanently delete all data
            </Typography>
          </DialogContent>
        </Box>

        {/* Form Block */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            display: "block",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <TextField
            autoFocus
            required
            fullWidth
            margin="none"
            id="new-password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            error={!!error}
            helperText={error || " "} // Ensure helperText space is reserved to prevent layout shifts
            placeholder={`Enter ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`} // Figma: Enter 10–20 characters.
            variant="outlined"
            InputLabelProps={{ style: { fontFamily: "Inter, sans-serif" } }}
            sx={{
              marginBottom: "16px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px", // Figma: borderRadius: 8
                backgroundColor: "white",
                height: "56px", // Figma: height: 56
                fontFamily: "Inter, sans-serif",
                "& fieldset": {
                  borderColor: "#CACACA", // Figma: outline: '1px #CACACA solid'
                },
                "&:hover fieldset": {
                  borderColor: "#A0A0A0",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#007AFF",
                },
                "&.Mui-error fieldset": {
                  borderColor: "#D32F2F",
                },
              },
              "& .MuiInputBase-input": {
                padding: "0 14px",
                height: "100%",
                fontSize: "16px",
                fontFamily: "Inter, sans-serif",
                fontWeight: "400",
                "&::placeholder": {
                  color: "#CACACA", // Figma: color: '#CACACA' for placeholder
                  opacity: 1,
                  fontFamily: "Inter, sans-serif",
                  fontSize: "16px",
                  fontWeight: "400",
                },
              },
            }}
          />
          <DialogActions sx={{ padding: 0, width: "100%" }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={
                !password ||
                password.length < MIN_PASSWORD_LENGTH ||
                password.length > MAX_PASSWORD_LENGTH
              }
              sx={{
                height: "48px", // Figma: height: 48
                background: password ? "#131A28" : "#F3F3F3", // Figma: background: '#F3F3F3'
                color: password ? "#C1FF83" : "#CACACA", // Figma: color: '#CACACA' (use for disabled), use darker for enabled
                borderRadius: "24px", // Figma: borderRadius: 24
                padding: "0 10px", // Figma: padding: 10 (adjust for vertical centering)
                textTransform: "none",
                fontSize: "16px", // Figma: fontSize: 16
                fontFamily: "Inter, sans-serif", // Figma: fontFamily: 'Inter'
                fontWeight: "600", // Figma: fontWeight: '600'
                boxShadow: "none",
                "&:hover": {
                  //   background: password ? '#E5E5E5' : '#F3F3F3', // Darker on hover for enabled
                  boxShadow: "none",
                },
                "&.Mui-disabled": {
                  // Explicit styling for disabled state
                  background: "#F3F3F3",
                  color: "#CACACA",
                },
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Box>
      </Box>
    </Dialog>
  );
}
