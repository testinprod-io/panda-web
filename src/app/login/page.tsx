"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Box, Typography, CircularProgress } from "@mui/material";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/");
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
        background: "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)"
    }}>
      <Image
        src="/icons/rounded-logo.svg"
        alt="Panda AI Logo"
        width={100}
        height={100}
      />
      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
        Log In to Panda AI
      </Typography>
      <Button variant="contained" onClick={login} size="large" sx={{mt: 2}}>
        Log In / Sign up
      </Button>
    </Box>
  );
}