"use client";

import { useEffect, useState } from "react";
import { usePandaSDK, useSDKState } from "@/providers/sdk-provider";
import { User } from "@/sdk/auth/types";

/**
 * Custom hook to get the authentication status from the SDK.
 * Provides boolean flags for readiness and authentication state.
 */
export function useAuthStatus() {
  const { sdk, initializationState } = useSDKState();
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    user: User | null;
  }>({
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    if (!sdk || !initializationState.isInitialized) {
      setAuthState({ isAuthenticated: false, user: null });
      return;
    }

    // Set initial auth state
    const currentAuthState = sdk.auth.getState();
    setAuthState(currentAuthState);

    // Subscribe to auth state changes
    const unsubscribe = sdk.auth.on('authStateChanged', (newAuthState) => {
      setAuthState(newAuthState);
    });

    return unsubscribe;
  }, [sdk, initializationState.isInitialized]);

  return {
    isReady: initializationState.isInitialized && !initializationState.isAuthenticating,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isAuthenticating: initializationState.isAuthenticating,
    initializationError: initializationState.error,
  };
}
