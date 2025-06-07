"use client";

import React, { useState, useCallback, useEffect } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEncryption } from "@/providers/encryption-provider";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 20;

const getDynamicError = (password: string) => {
  if (
    password &&
    (password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH)
  ) {
    return `*Password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`;
  }
  return "";
};

const validateSubmit = (password: string) => {
  if (!password) return "Password cannot be empty.";
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
};

const isSubmitDisabled = (password: string, error: string) => {
  return (
    !password ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH ||
    !!error
  );
};

export default function CreatePassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, logout, ready, authenticated } = usePrivy();
  const { isFirstTimeUser, createPassword } = useEncryption();

  useEffect(() => {
    // if user is not authenticated, they shouldn't be here.
    // if (ready && !authenticated) {
    //   router.replace('/signup');
    // }

    if (isFirstTimeUser === false) {
      router.replace('/');
    }
  }, [ready, authenticated, router, isFirstTimeUser]);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    const dynamicError = getDynamicError(newPassword);
    setError(dynamicError);
  };

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const validationError = validateSubmit(password);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError("");

      try {
        await createPassword(password);
        router.replace("/signup?step=password-confirmation");
      } catch (err: any) {
        setError(err.message || "Failed to process password");
      }
    },
    [password, createPassword, router],
  );

  const handleLogOut = useCallback(() => {
    logout().then(() => {
        router.replace("/");
    });
  }, [logout, router]);

  const isButtonDisabled = isSubmitDisabled(password, error);
  const displayedError = getDynamicError(password) || error;
  
  if (!ready || !authenticated || isFirstTimeUser === undefined) {
      return <div></div>
  }

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
        background: "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)"
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: '410px', marginRight: 'auto', mb: 10 }}>
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
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "left",
            gap: "12px",
            marginTop: "15vh",
            // marginBottom: "20px",
          }}
        >
          {/* <Image
            src="/icons/rounded-logo.svg"
            alt="Panda AI Logo"
            width={64}
            height={64}
          /> */}
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
            Create Encryption Password
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#131A28",
              fontSize: "16px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "500",
              textAlign: "left",
              marginTop: "24px"
            }}
          >
            To protect your chat data, set a password. If you forget it, you'll need to reset the service, which will permanently delete all data.
          </Typography>
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
            id="create-password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={handlePasswordChange}
            error={!!displayedError}
            placeholder={`Enter ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`}
            sx={{
              "& .MuiOutlinedInput-input": {
                border: "none",
              },

              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                backgroundColor: "white",
                height: "40px",
                fontFamily: "Inter, sans-serif",
                border: "none",
                // "& fieldset": { borderColor: "#CACACA" },
                // "&:hover fieldset": { borderColor: "#A0A0A0" },
                "&.Mui-focused fieldset": { 
                  // boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2), 0 0 0 2px #000000",
                 },
                "&.Mui-error fieldset": { borderColor: "#F33D4F" },
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
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
            Confirm
          </Button>

          {/* <Button
            variant="outlined"
            fullWidth
            sx={{
              height: "48px",
              background: "#FFFFFF",
              color: "#131A28",
              borderRadius: "24px",
              borderColor: "#B3B3B3",
              textTransform: "none",
              fontSize: "16px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "400",
              boxShadow: "none",
            }}
            onClick={handleLogOut}
          >
            Log out
          </Button> */}
        </Box>
      </Box>
    </Box>
  );
}