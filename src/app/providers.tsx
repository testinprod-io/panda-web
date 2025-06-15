"use client";

import * as React from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { Toaster } from "react-hot-toast";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import { SnackbarProvider } from "@/providers/snackbar-provider";
import { AuthChatListener } from "@/providers/auth-chat-listener";
import { ApiClientProvider } from "@/providers/api-client-provider";
import { EncryptionProvider } from "@/providers/encryption-provider";
import { PandaSDKProvider } from "@/providers/sdk-provider";

function AuthenticatedContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
        <EncryptionProvider>
          <AuthChatListener />
          <SnackbarProvider>{children}</SnackbarProvider>
        </EncryptionProvider>
    </>
  );
}

function SDKWrapper({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = usePrivy();
  if (!getAccessToken) {
    // This can happen briefly while Privy is initializing.
    // Return a loader or null.
    return null; 
  }
  return (
    <PandaSDKProvider getAccessToken={getAccessToken}>
      {children}
    </PandaSDKProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    console.error(
      "Privy App ID is missing. Please set NEXT_PUBLIC_PRIVY_APP_ID in your environment variables.",
    );
  }

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster position="top-center" reverseOrder={false} />
        {privyAppId ? (
          <PrivyProvider
            appId={privyAppId}
            config={{
              loginMethods: ["wallet", "email", "google", "github"],
              appearance: {
                theme: "light",
                accentColor: "#676FFF",
                logo: "/logo.png",
              },
              embeddedWallets: {
                createOnLogin: "users-without-wallets",
              },
            }}
          >
            <ApiClientProvider>
              <SDKWrapper>
                <AuthenticatedContentWrapper>
                  {children}
                </AuthenticatedContentWrapper>
              </SDKWrapper>
            </ApiClientProvider>
          </PrivyProvider>
        ) : (
          <SnackbarProvider>{children}</SnackbarProvider>
        )}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
