"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Box, Typography, CircularProgress } from "@mui/material";

export default function CreateAccount() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/signup?step=password");
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
    }}>
      <Typography variant="h4" gutterBottom>Create Your Panda AI Account</Typography>
      <Typography variant="body1" sx={{ mt: 1, mb: 3 }}>
        Click the button below to sign up with your email or social account.
      </Typography>
      <Button variant="contained" onClick={login} size="large">
        Sign up / Log in
      </Button>
    </Box>
  );
}