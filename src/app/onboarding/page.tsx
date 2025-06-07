"use client";
import { useEffect, useState } from "react";
import { useApiClient } from "@/providers/api-client-provider";
import { useRouter } from "next/navigation";
import OnboardingView from "./onboarding-view";
import { Box, CircularProgress } from "@mui/material";
import styles from "./onboarding.module.scss";
import { usePrivy } from "@privy-io/react-auth";
export default function OnboardingPage() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const apiClient = useApiClient();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        await apiClient.app.getCustomizedPrompts();
        setNeedsOnboarding(true);
      } catch (error: any) {
        if (error && typeof error === "object" && "status" in error && error.status === 404) {
          setNeedsOnboarding(true);
        } else {
          console.error("Failed to check onboarding status:", error);
          setNeedsOnboarding(true);
        }
      }
    };
    if (ready && authenticated) {
      checkOnboardingStatus();
    }
  }, [apiClient, authenticated]);

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
      <Box className={styles.container} style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
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