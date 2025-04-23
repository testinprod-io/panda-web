'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { EncryptionService } from '@/app/services/EncryptionService';
import { PasswordPromptModal } from '@/app/components/modal/PasswordPromptModal'; // Adjust path if needed
import { useChatStore } from '@/app/store/chat';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

// Define the inactivity timeout (e.g., 15 minutes) in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Legacy key data for potential migration from hardcoded values
const LEGACY_KEY = '1234567890123456'; // Only used for legacy data migration

interface EncryptionContextType {
  isLocked: boolean;
  unlockApp: (password: string) => boolean; // Now takes password, returns success
  lockApp: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function useEncryption(): EncryptionContextType {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
}

interface EncryptionProviderProps {
  children: ReactNode;
}

export function EncryptionProvider({ children }: EncryptionProviderProps) {
  // Initialize lock state based on whether the key is already set (e.g., from previous session)
  const [isLocked, setIsLocked] = useState<boolean>(true); // Always start locked
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatStore = useChatStore();

  // Try auto-migration for existing users who had hardcoded keys
  useEffect(() => {
    const hasInitialized = localStorage.getItem('pandaai-encryption-initialized');
    // If no initialization flag but we have sessions, might need migration
    if (!hasInitialized && chatStore.sessions.length > 0) {
      console.log('[EncryptionProvider] Found existing sessions but no encryption setup. Checking for migration needs...');
      // This is where we'd check if old data exists and needs migration
      setIsLocked(true);
    }
  }, [chatStore.sessions]);

  const migrateData = useCallback((newPassword: string) => {
    // This is a simplified migration concept - a real implementation would:
    // 1. Use the legacy key to decrypt existing data
    // 2. Re-encrypt with the new user-provided key
    // 3. Save the re-encrypted data
    console.log('[EncryptionProvider] Migration would happen here...');
    
    // For this example, we'll just mark the migration as complete
    localStorage.setItem('pandaai-encryption-initialized', 'true');
    setIsLocked(false);
  }, []);

  // Set up error handling for encryption-related operations
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if it's an encryption-related error
      if (error && error.message && typeof error.message === 'string' && 
          (error.message.includes('decrypt') || error.message.includes('encrypt') || 
           error.message.includes('key'))) {
        console.error('[EncryptionProvider] Caught encryption error:', error);
        
        // Lock the app and show error
        EncryptionService.clearKey();
        setIsLocked(true);
        setHasError(true);
        setErrorMessage(error.message);
        
        // Prevent default error handling
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only set a new timer if the app is *not* locked
    if (!isLocked) {
        inactivityTimerRef.current = setTimeout(() => {
          console.log('[EncryptionProvider] Inactivity timeout reached. Locking app.');
          lockApp();
        }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isLocked]); // Rerun when lock state changes

  const lockApp = useCallback(() => {
    EncryptionService.clearKey();
    setIsLocked(true);
    setHasError(false); // Clear any errors when manually locking
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    console.log('[EncryptionProvider] App locked.');
  }, []);

  // Note: The modal now handles calling EncryptionService.setKeyFromPassword
  // This function just updates the provider's state
  const handleUnlockSuccess = useCallback(() => {
    setIsLocked(false);
    setHasError(false); // Clear errors on successful unlock
    resetInactivityTimer(); // Start timer on successful unlock
    console.log('[EncryptionProvider] App unlocked.');
  }, [resetInactivityTimer]);

  // Handle encryption errors by requesting password again
  const handleEncryptionError = useCallback((error: Error) => {
    setErrorMessage(error.message);
    setHasError(true);
    lockApp();
  }, [lockApp]);

  // Function exposed via context - kept for potential manual locking triggers
  const contextLockApp = useCallback(() => {
    lockApp();
  }, [lockApp]);

  // Simplified unlock function for context - modal handles the actual key setting
  const contextUnlockApp = useCallback((password: string): boolean => {
    try {
      EncryptionService.setKeyFromPassword(password);
      
      if (EncryptionService.isKeySet()) {
        handleUnlockSuccess();
        return true;
      }
      return false;
    } catch (error) {
      console.error("[EncryptionProvider] Error during unlock:", error);
      if (error instanceof Error) {
        handleEncryptionError(error);
      }
      return false;
    }
  }, [handleUnlockSuccess, handleEncryptionError]);


  // Set up global event listeners to reset the timer on user activity
  useEffect(() => {
    const handleActivity = () => {
       // Only reset timer if the app isn't locked
      if (!isLocked) {
        resetInactivityTimer();
      }
    };

    // Listen for common user interaction events
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup listeners and timer on component unmount
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer, isLocked]); // Rerun effect if lock state changes

  const contextValue: EncryptionContextType = {
    isLocked,
    unlockApp: contextUnlockApp, // Provide the simplified unlock
    lockApp: contextLockApp,    // Provide the lock function
  };

  return (
    <EncryptionContext.Provider value={contextValue}>
      {/* Conditionally render the modal */}
      {isLocked && (
        <>
          {hasError && (
            <Box
              sx={{
                position: 'fixed',
                top: '20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <Alert 
                severity="error" 
                sx={{ maxWidth: '80%' }}
                action={
                  <Button color="inherit" size="small" onClick={() => setHasError(false)}>
                    Dismiss
                  </Button>
                }
              >
                Encryption error: {errorMessage || "Please unlock with the correct password."}
              </Alert>
            </Box>
          )}
          <PasswordPromptModal
             open={isLocked}
             onUnlock={handleUnlockSuccess} // Pass the callback
          />
        </>
      )}
      {/* Render children only when unlocked */}
      {!isLocked ? children : null}
    </EncryptionContext.Provider>
  );
} 