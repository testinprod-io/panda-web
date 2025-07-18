"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import { PandaSDK } from "@/sdk/PandaSDK";
import { GetAccessTokenFn } from "@/sdk/client/types";
import { usePrivy } from "@privy-io/react-auth";
import { PrivyAuthAdapter } from "./privy-auth-adapter";
import { useVaultIntegrationContext } from "@/sdk/vault/VaultIntegration";

interface SDKProviderProps {
  children: ReactNode;
  getAccessToken: GetAccessTokenFn;
}

interface PandaSDKContextValue {
  sdk: PandaSDK;
  isReady: boolean;
}

const SDKContext = createContext<PandaSDKContextValue | null>(null);

export function PandaSDKProvider({
  children,
  getAccessToken,
}: SDKProviderProps) {
  const privy = usePrivy();
  const { ready, authenticated, user } = privy;
  const [isReady, setIsReady] = useState(false);

  const authAdapter = useMemo(() => {
    // if (!ready) return null;
    return new PrivyAuthAdapter(privy);
  }, [ready]);

  useEffect(() => {
    if (authAdapter) {
      authAdapter.updateAuthState(authenticated, user);
    }
  }, [authAdapter, authenticated, user]);

  // Get vault integration from context
  const vaultIntegration = useVaultIntegrationContext();

  const sdk = useMemo(() => {
    if (!authAdapter) return null;
    return new PandaSDK(getAccessToken, authAdapter, vaultIntegration);
  }, [getAccessToken, authAdapter, vaultIntegration]);

  useEffect(() => {
    if (sdk) {
      const handleReady = (ready: boolean) => {
        setIsReady(ready);
      };
      sdk.bus.on("sdk.ready", handleReady);

      return () => {
        sdk.bus.off("sdk.ready", handleReady);
      };
    }
  }, [sdk]);

  useEffect(() => {
    if (sdk && ready && authenticated) {
      sdk.handleAuthenticated();
    }
  }, [sdk, ready, authenticated]);

  if (sdk) {
    const contextValue = useMemo(
      () => ({
        sdk,
        isReady,
      }),
      [sdk, isReady]
    );

    return (
      <SDKContext.Provider value={contextValue}>{children}</SDKContext.Provider>
    );
  } else {
    return null;
  }
}

// This is the hook that components will use to access the SDK
export function usePandaSDK(): PandaSDKContextValue {
  const context = useContext(SDKContext);
  if (context === null) {
    throw new Error("usePandaSDK must be used within a PandaSDKProvider");
  }
  return context;
}
