'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAppConfig } from '@/store';
import { ClientApi, getClientApi } from '@/client/api';
import { ServiceProvider } from '@/app/constant';
import type { GetAccessTokenFn } from '@/client/platforms/panda'; // Import the type

// Define a default/placeholder getAccessToken function
const defaultGetAccessToken: GetAccessTokenFn = async () => {
  console.warn('Attempted to use default getAccessToken. Privy context might not be ready or available.');
  return null;
};

// Create the context with a default value (can be null or a dummy implementation)
const ApiClientContext = createContext<ClientApi | null>(null);

export const ApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiProvider } = useAppConfig();
  const { ready: privyReady, authenticated: privyAuthenticated, getAccessToken } = usePrivy();

  // Use the real getAccessToken if Privy is ready and authenticated, otherwise use the default
  // Ensure getAccessToken from Privy matches the expected type GetAccessTokenFn
  const effectiveGetAccessToken = useMemo(() => {
      if (privyReady && getAccessToken) {
        // Explicitly cast or ensure the function signature matches
        return getAccessToken as GetAccessTokenFn;
      }
      return defaultGetAccessToken;
  }, [privyReady, getAccessToken]);


  const apiClient = useMemo(() => {
    // Only create the client if Privy is ready, otherwise, Panda might fail immediately
    // if it tries to get a token.
    if (!privyReady) {
        // Return a temporary client or null, depending on how consumers handle it.
        // Using OpenAI as a safe default if Privy isn't ready.
        console.warn('[ApiClientProvider] Privy not ready, using default OpenAI client temporarily.');
        return getClientApi(ServiceProvider.Panda, defaultGetAccessToken); // Provide default token getter
    }

    try {
        // Pass the effective (potentially default) token getter function
        return getClientApi(apiProvider, effectiveGetAccessToken);
    } catch (error) {
        console.error("[ApiClientProvider] Error creating API client:", error);
        // Fallback to a default client in case of errors during instantiation
        // (e.g., missing getAccessToken for Panda)
         console.warn('[ApiClientProvider] Falling back to default OpenAI client due to error.');
        return getClientApi(ServiceProvider.Panda, defaultGetAccessToken); // Provide default token getter
    }

  // Depend on apiProvider, privyReady, and the effectiveGetAccessToken function itself
  }, [apiProvider, privyReady, effectiveGetAccessToken]);

  return (
    <ApiClientContext.Provider value={apiClient}>
      {children}
    </ApiClientContext.Provider>
  );
};

// Custom hook to use the API client context
export const useApiClient = (): ClientApi => {
  const context = useContext(ApiClientContext);
  if (context === null) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return context;
}; 