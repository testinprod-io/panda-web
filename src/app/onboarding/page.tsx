"use client";
import { useEffect, useState } from "react";
import { useApiClient } from "@/providers/api-client-provider";
import { useRouter } from "next/navigation";
import OnboardingView from "./onboarding-view";
import { Box, CircularProgress } from "@mui/material";
import styles from "./onboarding.module.scss";

export default function OnboardingPage() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const apiClient = useApiClient();
  const router = useRouter();

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
    checkOnboardingStatus();
  }, [apiClient]);

  useEffect(() => {
    if (needsOnboarding === false) {
      router.push("/");
    }
  }, [needsOnboarding, router]);

  if (needsOnboarding === null) {
    return (
      <Box className={styles.container}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (needsOnboarding) {
    return <OnboardingView />;
  }

  return null;
}