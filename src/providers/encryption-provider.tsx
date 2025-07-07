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
import { useVault } from "@/hooks/use-vault";

interface EncryptionContextType {
  isLocked: boolean;
  isFirstTimeUser: boolean | null;
  isVaultReady: boolean;
  unlockApp: (password: string) => Promise<boolean>;
  lockApp: () => void;
  createPassword: (password: string) => Promise<void>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(
  undefined,
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

const ENCRYPTED_PASSWORD_KEY = 'panda_encrypted_password';

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [encryptedPassword, setEncryptedPassword] = useState<string | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { user, authenticated, ready } = usePrivy();
  const pathname = usePathname();
  const router = useRouter();
  const { sdk } = usePandaSDK();
  const { encryptedId, lockApp: lockAppHook, unlockApp: unlockAppHook, createPassword: createPasswordHook } = useAuth();
  const isFirstTimeUser = sdk.ready ? encryptedId === null : null;
  
  const vault = useVault();
  const appConfig = useAppConfig();
  
  const passwordExpirationMinutes = appConfig.passwordExpirationMinutes;
  
  // Check if this is a first-time user (no encrypted password stored)
  // const isFirstTimeUser = sdk.ready ? encryptedPassword === null : null;

  // Set up vault password update callback
  useEffect(() => {
    if (vault.onPasswordUpdated) {
      vault.onPasswordUpdated = (newEncryptedPassword: string) => {
        console.log('[EncryptionProvider] Password updated due to key rotation');
        setEncryptedPassword(newEncryptedPassword);
        localStorage.setItem(ENCRYPTED_PASSWORD_KEY, newEncryptedPassword);
      };
    }
  }, [vault.onPasswordUpdated]);

  // Load encrypted password from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ENCRYPTED_PASSWORD_KEY);
      setEncryptedPassword(stored);
      console.log('[EncryptionProvider] Loaded encrypted password from storage:', !!stored);
    }
  }, []);

  // Try to automatically unlock with stored encrypted password
  useEffect(() => {
    if (vault.state.isReady && encryptedPassword && isLocked) {
      console.log('[EncryptionProvider] Attempting auto-unlock with stored password');
      tryAutoUnlock();
    }
  }, [vault.state.isReady, encryptedPassword, isLocked]);

  const tryAutoUnlock = async () => {
    if (!encryptedPassword) return;

    try {
      console.log('[EncryptionProvider] Trying to update key with stored password');
      const newEncryptedPassword = await vault.updateKey(encryptedPassword);
      
      // Update stored password if it changed (key rotation)
      if (newEncryptedPassword !== encryptedPassword) {
        setEncryptedPassword(newEncryptedPassword);
        localStorage.setItem(ENCRYPTED_PASSWORD_KEY, newEncryptedPassword);
      }

      // Vault is now ready with password, unlock the app
      setIsLocked(false);
      setHasError(false);
      resetInactivityTimer();
      console.log('[EncryptionProvider] Auto-unlock successful');
    } catch (error) {
      console.log('[EncryptionProvider] Auto-unlock failed, user needs to input password:', error);
      // Don't set error state, just require password input
      // The modal will show automatically since isLocked=true and isFirstTimeUser=false
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
        setIsLocked(true);
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
        handleUnhandledRejection,
      );
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only set a new timer if the app is *not* locked and expiration is not "Never"
    if (!isLocked && passwordExpirationMinutes > 0) {
      const timeoutMs = passwordExpirationMinutes * 60 * 1000;
      console.log("[EncryptionProvider] Inactivity timer set for", timeoutMs, "ms");
      inactivityTimerRef.current = setTimeout(() => {
        console.log(
          "[EncryptionProvider] Inactivity timeout reached. Locking app.",
        );
        lockApp();
      }, timeoutMs);
    }
  }, [isLocked, passwordExpirationMinutes, inactivityTimerRef]); // Rerun when lock state or expiration changes

  const lockApp = useCallback(() => {
    setIsLocked(true);
    setHasError(false); // Clear any errors when manually locking
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    console.log("[EncryptionProvider] App locked.");
  }, []);

  // Handle successful unlock
  const handleUnlockSuccess = useCallback(() => {
    setIsLocked(false);
    setHasError(false); // Clear errors on successful unlock
    resetInactivityTimer(); // Start timer on successful unlock
    console.log("[EncryptionProvider] App unlocked.");
  }, [resetInactivityTimer]);

  // Handle encryption errors by showing error
  const handleEncryptionError = useCallback((error: Error) => {
    setErrorMessage(error.message);
    setHasError(true);
    setIsLocked(true);
  }, []);

  // Unlock function for existing users with stored encrypted password
  const contextUnlockApp = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        if (!vault.state.isReady) {
          throw new Error('Vault not ready');
        }

        if (encryptedPassword) {
          // Try to verify the password by updating the key
          // This will fail if the password is incorrect
          await vault.updateKey(encryptedPassword);
        } else {
          // No stored password, set it with the vault
          const newEncryptedPassword = await vault.setPassword(password);
          setEncryptedPassword(newEncryptedPassword);
          localStorage.setItem(ENCRYPTED_PASSWORD_KEY, newEncryptedPassword);
        }

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
    [vault, encryptedPassword, handleUnlockSuccess, handleEncryptionError],
  );

  // Handler for password creation (first-time users)
  const handleCreatePassword = useCallback(
    async (newPassword: string) => {
      try {
        console.log("[EncryptionProvider] Creating new password.");

        if (!vault.state.isReady) {
          throw new Error('Vault not ready');
        }

        // Set password with vault and get encrypted version
        const newEncryptedPassword = await vault.setPassword(newPassword);
        
        // Store encrypted password
        setEncryptedPassword(newEncryptedPassword);
        localStorage.setItem(ENCRYPTED_PASSWORD_KEY, newEncryptedPassword);

        handleUnlockSuccess(); // Unlock the app
        console.log(
          "[EncryptionProvider] New password created and app unlocked.",
        );
      } catch (error) {
        console.error(
          "[EncryptionProvider] Error during password creation:",
          error,
        );
        if (error instanceof Error) {
          handleEncryptionError(error);
        }
        setIsLocked(true);
        throw error;
      }
    },
    [vault, handleUnlockSuccess, handleEncryptionError],
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
      console.log("[EncryptionProvider] Privy user logged out. Locking app.");
      lockApp();
    }
  }, [user, isLocked, lockApp]);

  useEffect(() => {
    if (router && isFirstTimeUser === true) {
      router.push("/signup?step=create-password");
    }
  }, [isFirstTimeUser, router]);

  const contextValue: EncryptionContextType = {
    isLocked,
    isFirstTimeUser,
    isVaultReady: vault.state.isReady,
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
  const showUnlockModal = isLocked && !isSignupPage && isFirstTimeUser === false && vault.state.isReady;

  return (
    <EncryptionContext.Provider value={contextValue}>
      {showUnlockModal && (
        <PasswordModal
          open={true}
          onUnlockSubmit={contextUnlockApp}
          onClose={() => {
            console.log(
              "[EncryptionProvider] Unlock PasswordModal onClose triggered. App state (isLocked):",
              isLocked,
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
