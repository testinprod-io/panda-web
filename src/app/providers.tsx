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
import { VaultIntegrationProvider } from "@/sdk/vault/VaultIntegration";
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

function AuthenticatedContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <VaultIntegrationProvider>
        <SDKWrapper>
          <EncryptionProvider>
            {/* <AuthChatListener /> */}
            <SnackbarProvider>{children}</SnackbarProvider>
          </EncryptionProvider>
        </SDKWrapper>
      </VaultIntegrationProvider>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

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
                  // logo: "/logo.png",
                },
                loginMethods: ["email", "google", "github", "wallet"],
                embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
              }}
            >
              <AuthenticatedContentWrapper>
                {children}
              </AuthenticatedContentWrapper>
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
