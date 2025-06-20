"use client";

import * as React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { Toaster } from "react-hot-toast";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme } from "@/theme";
import { useUserStore } from "@/store/user";
import useMediaQuery from "@mui/material/useMediaQuery";
import { SnackbarProvider } from "@/providers/snackbar-provider";
import { AuthChatListener } from "@/providers/auth-chat-listener";
import { ApiClientProvider } from "@/providers/api-client-provider";
import { EncryptionProvider } from "@/providers/encryption-provider";

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const themeMode = useUserStore((state) => state.get<string>("theme")) ?? "system";
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const muiTheme = React.useMemo(() => {
    return themeMode === "system"
      ? prefersDarkMode
        ? darkTheme
        : lightTheme
      : themeMode === "dark"
        ? darkTheme
        : lightTheme;
  }, [themeMode, prefersDarkMode]);

  React.useEffect(() => {
    const body = document.body;
    const newTheme = muiTheme.palette.mode;
    body.classList.remove("light", "dark");
    body.classList.add(newTheme);
  }, [muiTheme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
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
          <AuthChatListener />
          <SnackbarProvider>{children}</SnackbarProvider>
        </EncryptionProvider>
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
      <ThemeWrapper>
        {privyAppId ? (
          <PrivyProvider
            appId={privyAppId}
            config={{
              appearance: {
                theme: "light",
                accentColor: "#676FFF",
              },
              loginMethods: ["email", "google", "github", "wallet"],
              embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
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
      </ThemeWrapper>
    </AppRouterCacheProvider>
  );
}
