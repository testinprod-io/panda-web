"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { PandaSDK } from '@/sdk/PandaSDK';
import { GetAccessTokenFn } from '@/sdk/client/types';

interface SDKProviderProps {
  children: ReactNode;
  getAccessToken: GetAccessTokenFn;
}

const SDKContext = createContext<PandaSDK | null>(null);

// This is the provider component that will wrap your application
export function PandaSDKProvider({ children, getAccessToken }: SDKProviderProps) {
  // We use a ref to ensure the SDK is only instantiated once.
  const sdkRef = React.useRef<PandaSDK | null>(null);
  if (!sdkRef.current) {
    sdkRef.current = new PandaSDK(getAccessToken);
  }

  return (
    <SDKContext.Provider value={sdkRef.current}>
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
