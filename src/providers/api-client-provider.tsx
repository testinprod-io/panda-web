'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAppConfig } from '@/store';
import { ClientApi, getClientApi } from '@/client/api';
import { ServiceProvider } from '@/types/constant';
import type { GetAccessTokenFn } from '@/client/platforms/panda';

const defaultGetAccessToken: GetAccessTokenFn = async () => {
  console.warn('Attempted to use default getAccessToken. Privy context might not be ready or available.');
  return null;
};

export const ApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiProvider } = useAppConfig();
  const { ready: privyReady, getAccessToken } = usePrivy();

  const apiClient = useMemo(() => {
    if (!privyReady || !getAccessToken) {
        return getClientApi(ServiceProvider.Panda, defaultGetAccessToken);
    }

    try {
        return getClientApi(apiProvider, getAccessToken);
    } catch (error) {
        console.error("[ApiClientProvider] Error creating API client:", error);
        throw error;
    }
  }, [apiProvider, privyReady, getAccessToken]);

  return (
    <ApiClientContext.Provider value={apiClient}>
      {children}
    </ApiClientContext.Provider>
  );
};

const ApiClientContext = createContext<ClientApi | null>(null);
export const useApiClient = (): ClientApi => {
  const context = useContext(ApiClientContext);
  if (context === null) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return context;
}; 