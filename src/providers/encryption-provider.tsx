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
import { EncryptionService } from "@/services/encryption-service";
import { PasswordModal } from "@/components/login/password-modal";
import { useApiClient } from "@/providers/api-client-provider";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

// Define the inactivity timeout (e.g., 15 minutes) in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

interface EncryptionContextType {
  isLocked: boolean;
  isFirstTimeUser: boolean | undefined;
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

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  // Always start locked
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiClient = useApiClient();
  const { user, authenticated } = usePrivy();
  const pathname = usePathname();
  const router = useRouter();
  
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
          error.message.includes("key"))
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

  // Check for first-time user on mount
  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const verifyFirstTimeUser = async () => {
      try {
        const verificationToken = await apiClient.app.getEncryptedId();
        if (verificationToken.encrypted_id) {
          setIsFirstTimeUser(false);
          console.log(
            "[EncryptionProvider] Verification token found. Existing user.",
          );
          return;
        }
      } catch (error) {
        console.error(
          "[EncryptionProvider] Error verifying first time user:",
          error,
        );
      }
      setIsFirstTimeUser(true);
    };
    verifyFirstTimeUser();
  }, [apiClient, authenticated]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only set a new timer if the app is *not* locked
    if (!isLocked) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log(
          "[EncryptionProvider] Inactivity timeout reached. Locking app.",
        );
        lockApp();
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isLocked]); // Rerun when lock state changes

  const lockApp = useCallback(() => {
    // We're not clearing the key for now as requested
    // EncryptionService.clearKey();
    setIsLocked(true);
    setHasError(false); // Clear any errors when manually locking
    EncryptionService.clearKey();
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

  // Simplified unlock function - only for existing users now
  const contextUnlockApp = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        // First-time setup logic removed from here
        if (!user?.id) {
          throw new Error("User ID not found");
        }

        const verificationToken = await apiClient.app.getEncryptedId();
        if (
          verificationToken &&
          (await EncryptionService.verifyKey(
            verificationToken.encrypted_id,
            user?.id,
            password,
          ))
        ) {
          EncryptionService.setKeyFromPassword(password); // Sets the key for active use
          handleUnlockSuccess();
          return true;
        } else {
          handleEncryptionError(new Error("Invalid password"));
          return false;
        }
      } catch (error) {
        console.error("[EncryptionProvider] Error during unlock:", error);
        if (error instanceof Error) {
          handleEncryptionError(error);
        }
        return false;
      }
    },
    [apiClient, user?.id, handleUnlockSuccess, handleEncryptionError],
  ); // Removed isFirstTimeUser from deps if it was there implicitly

  // Handler for password creation
  const handleCreatePassword = useCallback(
    async (newPassword: string) => {
      try {
        console.log("[EncryptionProvider] Creating new password.");
        if (!user?.id) {
          throw new Error("User ID not found");
        }
        await EncryptionService.setKeyFromPassword(newPassword);

        const encryptedVerificationToken =
          EncryptionService.encryptVerificationToken(user?.id);
        await apiClient.app.createEncryptedId(encryptedVerificationToken);

        setIsFirstTimeUser(false); // No longer a first-time user
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
        // Ensure app remains locked or in a clear error state
        setIsLocked(true);
        throw error;
      }
    },
    [apiClient, user?.id, handleUnlockSuccess, handleEncryptionError],
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
  }, [resetInactivityTimer, isLocked]);

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
    unlockApp: contextUnlockApp,
    lockApp,
    createPassword: handleCreatePassword,
  };

  if (!authenticated || isFirstTimeUser === undefined) {
    return (
      <EncryptionContext.Provider value={contextValue}>
        {children}
      </EncryptionContext.Provider>
    );
  }

  const isSignupPage = pathname.startsWith("/signup");
  const isOnboardingPage = pathname.startsWith("/onboarding");
  const showUnlockModal = isLocked && !isSignupPage && isFirstTimeUser === false;

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
