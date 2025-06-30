"use client";

import * as React from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { Toaster } from "react-hot-toast";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme } from "@/theme";
import { SnackbarProvider } from "@/providers/snackbar-provider";
import { EncryptionProvider } from "@/providers/encryption-provider";
import { PandaSDKProvider } from "@/providers/sdk-provider";
import { useAppConfig } from "@/store/config";
import { Theme } from "@/store/config";

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, theme } = useTheme();
  const appConfig = useAppConfig();

  const muiTheme = React.useMemo(
    () => (resolvedTheme === "dark" ? darkTheme : lightTheme),
    [resolvedTheme],
  );

  React.useEffect(() => {
    if (theme) {
      appConfig.setTheme(theme as Theme);
    }
  }, [theme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

function AuthenticatedContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
        <EncryptionProvider>
          {/* <AuthChatListener /> */}
          <SnackbarProvider>{children}</SnackbarProvider>
        </EncryptionProvider>
    </>
  );
}

function SDKWrapper({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = usePrivy();
  // if (!getAccessToken) {
  //   // This can happen briefly while Privy is initializing.
  //   // Return a loader or null.
  //   return null; 
  // }
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
    <AppRouterCacheProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="theme"
      >
        <ThemeWrapper>
          {privyAppId ? (
            <PrivyProvider
              appId={privyAppId}
              config={{
                appearance: {
                  theme: "light",
                  accentColor: "#676FFF",
                  logo: "/logo.png",
                },
                loginMethods: ["email", "google", "github", "wallet"],
                embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
              }}
            >
              <SDKWrapper>
                <AuthenticatedContentWrapper>
                  {children}
                </AuthenticatedContentWrapper>
              </SDKWrapper>
            </PrivyProvider>
          ) : (
            <SnackbarProvider>{children}</SnackbarProvider>
          )}
          <Toaster position="top-right" />
        </ThemeWrapper>
      </NextThemesProvider>
    </AppRouterCacheProvider>
  );
}
