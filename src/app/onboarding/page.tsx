"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingView from "./onboarding-view";
import { Box, CircularProgress } from "@mui/material";
import { usePrivy } from "@privy-io/react-auth";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useAuth } from "@/sdk/hooks";

export default function OnboardingPage() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  
  const router = useRouter();
  const { isReady, sdk } = usePandaSDK();
  const { ready, authenticated } = usePrivy();
  const { encryptedId } = useAuth();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      setNeedsOnboarding(encryptedId === null);
      return;

      // try {
      //   await sdk.storage.getCustomizedPrompts();
      //   setNeedsOnboarding(true);
      // } catch (error: any) {
      //   if (error && typeof error === "object" && "status" in error && error.status === 404) {
      //     setNeedsOnboarding(true);
      //   } else {
      //     console.error("Failed to check onboarding status:", error);
      //     setNeedsOnboarding(true);
      //   }
      // }
    };
    if (isReady && authenticated) {
      checkOnboardingStatus();
    }
  }, [sdk, authenticated]);
    
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }

    if (needsOnboarding === false) {
      router.push("/");
    }

  }, [ready, needsOnboarding, authenticated, router]);

  if (needsOnboarding === null) {
    return (
      <Box style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (needsOnboarding) {
    return <OnboardingView />;
  }

  return null;
}