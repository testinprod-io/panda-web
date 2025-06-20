"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { PandaSDK, SDKInitializationState } from '@/sdk/PandaSDK';
import { GetAccessTokenFn } from '@/sdk/client/types';
import { usePrivy } from '@privy-io/react-auth';
import { PrivyAuthAdapter } from './privy-auth-adapter';

interface SDKProviderProps {
  children: ReactNode;
  getAccessToken: GetAccessTokenFn;
}

interface SDKContextValue {
  sdk: PandaSDK | null;
  initializationState: SDKInitializationState;
  error: Error | null;
}

const SDKContext = createContext<SDKContextValue | null>(null);

// Error boundary component for SDK
function SDKErrorBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('SDK Error:', event.error);
      setHasError(true);
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      console.error('SDK Promise Rejection:', event.reason);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Loading component
function SDKLoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div>Loading Panda SDK...</div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        Initializing secure connection
      </div>
    </div>
  );
}

// Error fallback component
function SDKErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px'
    }}>
      <div style={{ color: '#d32f2f' }}>Failed to initialize Panda SDK</div>
      <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
        {error.message}
      </div>
      <button 
        onClick={retry}
        style={{
          padding: '8px 16px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
    </div>
  );
}

// This is the provider component that will wrap your application
export function PandaSDKProvider({ children, getAccessToken }: SDKProviderProps) {
  const privy = usePrivy();
  const { ready, authenticated, user } = privy;
  const [initializationState, setInitializationState] = useState<SDKInitializationState>({
    isInitialized: false,
    isAuthenticating: false,
  });
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const authAdapter = useMemo(() => {
    if (!ready) return null;
    return new PrivyAuthAdapter(privy, authenticated, user);
  }, [ready, privy, authenticated, user]);

  useEffect(() => {
    if (authAdapter) {
      authAdapter.updateAuthState(authenticated, user);
    }
  }, [authAdapter, authenticated, user]);

  const sdk = useMemo(() => {
    if (!authAdapter || !ready) return null;
    
    try {
      setError(null);
      return new PandaSDK(getAccessToken, authAdapter);
    } catch (error) {
      console.error('Failed to create SDK instance:', error);
      setError(error as Error);
      return null;
    }
  }, [getAccessToken, authAdapter, ready, retryCount]);

  // Initialize SDK when it's created and auth is ready
  useEffect(() => {
    if (!sdk || !ready) return;

    const initializeSDK = async () => {
      try {
        setInitializationState(prev => ({ ...prev, isAuthenticating: true }));
        await sdk.authenticate();
        setInitializationState(sdk.getInitializationState());
      } catch (error) {
        console.error('SDK initialization failed:', error);
        setError(error as Error);
        setInitializationState(prev => ({ 
          ...prev, 
          isAuthenticating: false, 
          error: error as Error 
        }));
      }
    };

    initializeSDK();
  }, [sdk, ready]);

  const retryInitialization = () => {
    setError(null);
    setInitializationState({
      isInitialized: false,
      isAuthenticating: false,
    });
    setRetryCount(prev => prev + 1);
  };

  const contextValue: SDKContextValue = {
    sdk,
    initializationState,
    error,
  };

  // Show loading while Privy is initializing or SDK is not ready
  if (!ready || initializationState.isAuthenticating) {
    return <SDKLoadingFallback />;
  }

  // Show error if SDK failed to initialize
  if (error) {
    return <SDKErrorFallback error={error} retry={retryInitialization} />;
  }

  return (
    <SDKErrorBoundary fallback={<SDKErrorFallback error={new Error("SDK encountered an unexpected error")} retry={retryInitialization} />}>
      <SDKContext.Provider value={contextValue}>
        {children}
      </SDKContext.Provider>
    </SDKErrorBoundary>
  );
}

// This is the hook that components will use to access the SDK
export function usePandaSDK(): PandaSDK {
  const context = useContext(SDKContext);
  if (context === null) {
    throw new Error('usePandaSDK must be used within a PandaSDKProvider');
  }
  
  if (!context.sdk) {
    throw new Error('SDK is not initialized. Please check your provider setup.');
  }
  
  return context.sdk;
}

// Hook to get SDK initialization state
export function useSDKState(): SDKContextValue {
  const context = useContext(SDKContext);
  if (context === null) {
    throw new Error('useSDKState must be used within a PandaSDKProvider');
  }
  return context;
}
