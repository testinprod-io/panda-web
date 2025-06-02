"use client";

import React from "react";
import { Box, Button, Typography, Modal } from "@mui/material";
import styles from "./login-signup-popup.module.scss";

interface LoginSignupPopupProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const LoginSignupPopup: React.FC<LoginSignupPopupProps> = ({
  open,
  onClose,
  onLogin,
  onSignup,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="login-signup-popup-title"
      aria-describedby="login-signup-popup-description"
      className={styles.modalBackdrop}
    >
      <Box className={styles.popupContainer}>
        <Box className={styles.contentWrapper}>
          <Typography variant="h1" className={styles.title}>
            Welcome 👋
          </Typography>
          <Typography variant="body1" className={styles.description}>
            Log in or sign up to access exclusive features and enjoy secure,
            private conversations.
          </Typography>
        </Box>
        <Box className={styles.buttonContainer}>
          <Button
            variant="contained"
            onClick={() => {
              onLogin();
              onClose();
            }}
            className={styles.loginButton}
          >
            Log in
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              onSignup();
              onClose();
            }}
            className={styles.signupButton}
          >
            Sign up
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default LoginSignupPopup;
