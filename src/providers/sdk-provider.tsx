"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { PandaSDK } from '@/sdk/PandaSDK';
import { GetAccessTokenFn } from '@/sdk/client/types';
import { usePrivy } from '@privy-io/react-auth';
import { PrivyAuthAdapter } from './privy-auth-adapter';

interface SDKProviderProps {
  children: ReactNode;
  getAccessToken: GetAccessTokenFn;
}

const SDKContext = createContext<PandaSDK | null>(null);

// This is the provider component that will wrap your application
export function PandaSDKProvider({ children, getAccessToken }: SDKProviderProps) {
  const privy = usePrivy();
  const { ready, authenticated, user } = privy;

  const authAdapter = useMemo(() => {
    // if (!ready) return null;
    return new PrivyAuthAdapter(privy, authenticated, user);
  }, [ready, privy, authenticated, user]);

  useEffect(() => {
    if (authAdapter) {
      authAdapter.updateAuthState(authenticated, user);
    }
  }, [authAdapter, authenticated, user]);

  const sdk = useMemo(() => {
    // if (!authAdapter) return null;
    return new PandaSDK(getAccessToken, authAdapter);
  }, [getAccessToken, authAdapter]);

  return (
    <SDKContext.Provider value={sdk}>
      {children}
    </SDKContext.Provider>
  );
}

// This is the hook that components will use to access the SDK
export function usePandaSDK(): PandaSDK {
  const context = useContext(SDKContext);
  if (context === null) {
    throw new Error('usePandaSDK must be used within a PandaSDKProvider');
  }
  return context;
}
