"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { PandaSDK } from '@/sdk/PandaSDK';
import { GetAccessTokenFn } from '@/sdk/client/types';
import { usePrivy } from '@privy-io/react-auth';
import { PrivyAuthAdapter } from './privy-auth-adapter';
// import { Box, Box, CircularProgress } from '@mui/material';

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
    console.log("NEWNEW authAdapter", authenticated, user);
    return new PrivyAuthAdapter(privy);
  }, [ready]);

  useEffect(() => {
    if (authAdapter) {
      authAdapter.updateAuthState(authenticated, user);
    }
  }, [authAdapter, authenticated, user]);

  
  const sdk = useMemo(() => {
    console.log("NEWNEW sdk", authAdapter);
    if (!authAdapter) return null;
    return new PandaSDK(getAccessToken, authAdapter);
  }, [getAccessToken, authAdapter]);
  
  useEffect(() => {
    if (sdk && ready && authenticated) {
      sdk.handleAuthenticated();
    }
  }, [sdk, ready, authenticated]);

  // if (!sdk || !sdk.initialized) { 
  //   return (
  //     <Box
  //       sx={{
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //         height: "100%",
  //         backgroundColor: "red",
  //       }}
  //     >
  //       <CircularProgress color="primary" />
  //     </Box>
  //   );
  // }

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
