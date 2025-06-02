"use client";

import { usePrivy } from "@privy-io/react-auth";

/**
 * Custom hook to get the authentication status from Privy.
 * Provides boolean flags for readiness and authentication state.
 */
export function useAuthStatus() {
  const { ready, authenticated } = usePrivy();

  return {
    isReady: ready, // Is Privy loaded and authentication status known?
    isAuthenticated: authenticated, // Is the user authenticated?
  };
}
