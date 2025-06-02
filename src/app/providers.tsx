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
import { optimism } from "viem/chains";

function AuthenticatedContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { authenticated } = usePrivy();

  return (
    <>
      {/* {authenticated ? ( */}
        <EncryptionProvider>
          <AuthChatListener />
          <SnackbarProvider>{children}</SnackbarProvider>
        </EncryptionProvider>
      {/* ) : (
        <SnackbarProvider>{children}</SnackbarProvider>
      )} */}
    </>
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
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {privyAppId ? (
          <PrivyProvider
            appId={privyAppId}
            config={{
              appearance: {
                theme: "light",
                accentColor: "#676FFF",
              },
              defaultChain: optimism,
              loginMethods: ["email", "google", "github", "wallet"],
              embeddedWallets: { createOnLogin: "users-without-wallets" },
            }}
          >
            <ApiClientProvider>
              <AuthenticatedContentWrapper>
                {children}
              </AuthenticatedContentWrapper>
            </ApiClientProvider>
          </PrivyProvider>
        ) : (
          <SnackbarProvider>{children}</SnackbarProvider>
        )}
        <Toaster position="top-right" />
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
