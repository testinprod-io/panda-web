"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { PasswordModal } from "@/components/login/password-modal";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { usePandaSDK } from "./sdk-provider";
import { useAuth } from "@/sdk/hooks";
import { useAppConfig } from "@/store/config";
import { useVaultIntegrationContext } from "@/sdk/vault/VaultIntegration";

interface EncryptionContextType {
  isLocked: boolean;
  isFirstTimeUser: boolean | null;
  isVaultReady: boolean;
  unlockApp: (password: string) => Promise<boolean>;
  lockApp: () => void;
  createPassword: (password: string) => Promise<void>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(
  undefined
);

export function useEncryption(): EncryptionContextType {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error("useEncryption must be used within an EncryptionProvider");
  }
  return context;
}

interface EncryptionProviderProps {
  children: ReactNode;
}

const ENCRYPTED_PASSWORD_KEY = "panda_encrypted_password";

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [encryptedPassword, setEncryptedPassword] = useState<string | null>(
    null
  );
  const [bootstrapAttempted, setBootstrapAttempted] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { user, authenticated, ready } = usePrivy();
  const pathname = usePathname();
  const router = useRouter();
  const { sdk } = usePandaSDK();
  const {
    encryptedId,
    user: authUser,
    lockApp: lockAppHook,
    unlockApp: unlockAppHook,
  } = useAuth();
  const isFirstTimeUser = sdk.ready ? encryptedId === null : null;

  const vaultIntegration = useVaultIntegrationContext();
  const appConfig = useAppConfig();

  const passwordExpirationMinutes = appConfig.passwordExpirationMinutes;

  // Load encrypted password from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ENCRYPTED_PASSWORD_KEY);

      // Add validation for stored encrypted password format
      if (stored) {
        try {
          // Basic validation - should be base64url encoded
          const decoded = atob(stored.replace(/-/g, "+").replace(/_/g, "/"));
          if (decoded.length < 32) {
            // Minimum expected length for salt + iv + data
            localStorage.removeItem(ENCRYPTED_PASSWORD_KEY);
            setEncryptedPassword(null);
            return;
          }
        } catch (e) {
          localStorage.removeItem(ENCRYPTED_PASSWORD_KEY);
          setEncryptedPassword(null);
          return;
        }
      }

      setEncryptedPassword(stored);
    }
  }, []);

  // Try to automatically unlock with stored encrypted password using bootstrap
  useEffect(() => {
    if (
      vaultIntegration.isVaultReady() &&
      encryptedId &&
      authUser?.id &&
      isLocked &&
      isFirstTimeUser === false &&
      authenticated
    ) {
      tryBootstrap();
    }
  }, [
    vaultIntegration.isVaultReady(),
    encryptedId,
    authUser?.id,
    encryptedPassword,
    isLocked,
    isFirstTimeUser,
    authenticated,
  ]);

  // For first-time users, mark bootstrap as attempted since they don't have a stored password
  useEffect(() => {
    if (isFirstTimeUser === true) {
      setBootstrapAttempted(true);
    }
  }, [isFirstTimeUser]);

  const tryBootstrap = async () => {
    if (!encryptedId || !authUser?.id || !encryptedPassword) {
      setBootstrapAttempted(true);
      return;
    }

    try {
      const response = await vaultIntegration.bootstrap(
        encryptedId,
        authUser.id,
        encryptedPassword ?? undefined
      );

      if (!response.ok) {
        setBootstrapAttempted(true);
      }

      if (response.needsPassword) {
        setBootstrapAttempted(true);
        return; // Modal will show automatically
      }

      if (response.isValid === false) {
        setHasError(true);
        setErrorMessage("Invalid password");
        setBootstrapAttempted(true);
        return;
      }

      // Bootstrap successful
      if (
        response.encryptedPassword &&
        response.encryptedPassword !== encryptedPassword
      ) {
        setEncryptedPassword(response.encryptedPassword);
        localStorage.setItem(
          ENCRYPTED_PASSWORD_KEY,
          response.encryptedPassword
        );
      }

      // Check if user is actually authenticated before unlocking


      if (!authenticated) {
        setBootstrapAttempted(true);
        return;
      }

      // User is authenticated and bootstrap succeeded - safe to unlock
      handleUnlockSuccess();
      setBootstrapAttempted(true);
    } catch (error) {
      // Don't set error state, just require password input
      // The modal will show automatically since isLocked=true and isFirstTimeUser=false
      setBootstrapAttempted(true);
    }
  };

  // Set up error handling for encryption-related operations
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Check if it's an encryption-related error
      if (
        error &&
        error.message &&
        typeof error.message === "string" &&
        (error.message.includes("decrypt") ||
          error.message.includes("encrypt") ||
          error.message.includes("key") ||
          error.message.includes("vault"))
      ) {
        console.error("[EncryptionProvider] Caught encryption error:", error);

        // Lock the app and show error
        // setIsLocked(true);
        setHasError(true);
        setErrorMessage(error.message);

        // Prevent default error handling
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () =>
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
  }, []);

  const lockApp = useCallback(async () => {
    setIsLocked(true);
    setHasError(false); // Clear any errors when manually locking
    localStorage.removeItem(ENCRYPTED_PASSWORD_KEY);
    setEncryptedPassword(null);
    await vaultIntegration.clearKeys();
    setBootstrapAttempted(true); // Reset bootstrap attempt status

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    await lockAppHook();
  }, [lockAppHook]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only set a new timer if the app is *not* locked and expiration is not "Never"
    if (!isLocked && passwordExpirationMinutes > 0) {
      const timeoutMs = passwordExpirationMinutes * 60 * 1000;
      inactivityTimerRef.current = setTimeout(() => {
        lockApp();
      }, timeoutMs);
    }
  }, [isLocked, passwordExpirationMinutes]); // Rerun when lock state or expiration changes

  // Handle successful unlock
  const handleUnlockSuccess = useCallback(async () => {
    setIsLocked(false);
    setHasError(false); // Clear errors on successful unlock
    resetInactivityTimer(); // Start timer on successful unlock
    await unlockAppHook();
  }, [resetInactivityTimer, unlockAppHook]);

  // Handle encryption errors by showing error
  const handleEncryptionError = useCallback((error: Error) => {
    setErrorMessage(error.message);
    setHasError(true);
    // setIsLocked(true);
  }, []);

  // Unlock function for existing users
  const contextUnlockApp = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        if (!authenticated) {
          return false;
        }

        if (!vaultIntegration.isVaultReady()) {
          return false;
        }

        if (!encryptedId || !authUser?.id) {
          return false;
        }

        // Use setPassword with validation to verify the password and get encrypted version
        const encryptedPassword = await vaultIntegration.setPassword(
          password,
          encryptedId,
          authUser.id
        );

        // Validation successful, store the encrypted password
        setEncryptedPassword(encryptedPassword);
        localStorage.setItem(ENCRYPTED_PASSWORD_KEY, encryptedPassword);

        handleUnlockSuccess();
        return true;
      } catch (error) {
        console.error("[EncryptionProvider] Error during unlock:", error);
        if (error instanceof Error) {
          handleEncryptionError(error);
        }
        return false;
      }
    },
    [
      vaultIntegration,
      encryptedId,
      authUser?.id,
      handleUnlockSuccess,
      handleEncryptionError,
      authenticated,
    ]
  );

  // Handler for password creation (first-time users)
  const handleCreatePassword = useCallback(
    async (newPassword: string) => {
      try {
        if (!authenticated) {
          throw new Error("User not authenticated - cannot create password");
        }
        if (!authUser?.id) {
          throw new Error("User ID not available");
        }

        // Use vault to create user password, encrypt user ID, and store on server
        const response = await vaultIntegration.createUserPassword(
          newPassword,
          authUser.id
        );

        if (!response.ok) {
          throw new Error("Failed to create user password");
        }

        // Store encrypted password locally
        setEncryptedPassword(response.encryptedPassword);
        localStorage.setItem(
          ENCRYPTED_PASSWORD_KEY,
          response.encryptedPassword
        );

        // Update auth state to reflect the new encryptedId
        // We need to trigger a refresh of the auth state so the app knows encryptedId exists
        await sdk.auth.initializeAuthState();

        handleUnlockSuccess(); // Unlock the app
        console.log(
          "[EncryptionProvider] New password created, encrypted ID stored, and app unlocked."
        );
      } catch (error) {
        console.error(
          "[EncryptionProvider] Error during password creation:",
          error
        );
        if (error instanceof Error) {
          handleEncryptionError(error);
        }
        setIsLocked(true);
        throw error;
      }
    },
    [
      vaultIntegration,
      authUser?.id,
      sdk.auth,
      handleUnlockSuccess,
      handleEncryptionError,
      authenticated,
    ]
  );

  // Set up global event listeners to reset the timer on user activity
  useEffect(() => {
    const handleActivity = () => {
      // Only reset timer if the app isn't locked
      if (!isLocked) {
        resetInactivityTimer();
      }
    };

    // Listen for common user interaction events
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup listeners and timer on component unmount
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer, isLocked, passwordExpirationMinutes]);

  useEffect(() => {
    if (!user && !isLocked) {
      console.log("Privy user logged out. Locking app.");
      lockApp();
    }
  }, [user, isLocked, lockApp]);

  useEffect(() => {
    if (router && isFirstTimeUser === true) {
      router.push("/onboarding");
    }
  }, [isFirstTimeUser, router]);

  const contextValue: EncryptionContextType = {
    isLocked,
    isFirstTimeUser,
    isVaultReady: vaultIntegration.isVaultReady(),
    unlockApp: contextUnlockApp,
    lockApp,
    createPassword: handleCreatePassword,
  };

  if (!ready || !sdk.ready) {
    console.log("[EncryptionProvider] SDK not initialized. Locking app.");
    return (
      <EncryptionContext.Provider value={contextValue}>
        {children}
      </EncryptionContext.Provider>
    );
  }

  const isSignupPage = pathname.startsWith("/signup");
  const isOnboardingPage = pathname.startsWith("/onboarding");
  const showUnlockModal =
    isLocked &&
    !isSignupPage &&
    isFirstTimeUser === false &&
    vaultIntegration.isVaultReady() &&
    bootstrapAttempted &&
    !isOnboardingPage;

  return (
    <EncryptionContext.Provider value={contextValue}>
      {showUnlockModal && (
        <PasswordModal
          open={true}
          onUnlockSubmit={contextUnlockApp}
          onClose={() => {
            console.log(
              "[EncryptionProvider] Unlock PasswordModal onClose triggered. App state (isLocked):",
              isLocked
            );
          }}
        />
      )}

      <div
        style={{
          filter: showUnlockModal ? "blur(3px) brightness(0.8)" : "none",
          transition: "filter 0.5s ease-in-out",
          pointerEvents: showUnlockModal ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </EncryptionContext.Provider>
  );
}
