'use client';

import * as React from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { Toaster } from 'react-hot-toast'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';
import { SnackbarProvider } from '@/app/components/SnackbarProvider';
import { AuthChatListener } from '@/app/store/chat';

export function Providers({ children }: { children: React.ReactNode }) {
  // TODO: Replace with your actual Privy App ID from environment variables
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!privyAppId) {
    // This console log is helpful for development
    // In production, you might want to handle this differently, maybe show an error page
    console.error('Privy App ID is missing. Please set NEXT_PUBLIC_PRIVY_APP_ID in your environment variables.');
    // Render children without PrivyProvider if ID is missing, or render an error message/component
    // For simplicity, we'll render children, but auth won't work.
    // return <div>Configuration error: Privy App ID is missing.</div>;
  }

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Wrap with PrivyProvider only if appId is available */}
        {privyAppId ? (
          <PrivyProvider
            appId={privyAppId}
            config={{
              appearance: {
                theme: 'light',
                accentColor: '#676FFF',
                // logo: 'your-logo-url', // Optional
              },
              loginMethods: ['email', 'google', 'github', 'wallet'],
              embeddedWallets: { createOnLogin: 'users-without-wallets' }, // Optional
            }}
          >
            {/* AuthChatListener needs to be within PrivyProvider */}
            <AuthChatListener />
            <SnackbarProvider>
              {children}
            </SnackbarProvider>
          </PrivyProvider>
        ) : (
          // Render children without Privy context if ID is missing
          // Or render an error component
          <SnackbarProvider>
            {children}
          </SnackbarProvider>
        )}
        <Toaster position="top-right" />
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
} 