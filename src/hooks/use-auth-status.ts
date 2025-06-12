"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useApiClient } from "@/providers/api-client-provider";
import { useAppConfig } from "@/store";
import { useEffect, useState } from "react";
import { decryptSystemPrompt } from "@/types";
import { useEncryption } from "@/providers/encryption-provider";
import { useRouter } from "next/navigation";
/**
 * Custom hook to get the authentication status from Privy.
 * Provides boolean flags for readiness and authentication state.
 */
export function useAuthStatus() {
  const { ready, authenticated } = usePrivy();
  const appConfig = useAppConfig();
  const apiClient = useApiClient();
  const { isLocked } = useEncryption();
  const router = useRouter();
  const [hasFetchedPromptsThisSession, setHasFetchedPromptsThisSession] =
    useState(false);

  useEffect(() => {
    if (!authenticated) {
      setHasFetchedPromptsThisSession(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (apiClient && authenticated && !isLocked && !hasFetchedPromptsThisSession) {
      apiClient.app.getCustomizedPrompts().then((res) => {
        appConfig.setCustomizedPrompts(decryptSystemPrompt(res));
        setHasFetchedPromptsThisSession(true);
      }).catch((err) => {
        console.log("Failed to fetch prompts:", err);
        // router.push("/onboarding");
      });
    }
  }, [router, appConfig, apiClient, authenticated, hasFetchedPromptsThisSession, isLocked]);

  return {
    isReady: ready, // Is Privy loaded and authentication status known?
    isAuthenticated: authenticated, // Is the user authenticated?
  };
}
