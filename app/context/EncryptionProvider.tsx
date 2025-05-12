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
import { PasswordPromptModal } from '@/app/components/modal/PasswordPromptModal';
import { useChatStore } from '@/app/store/chat';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

// Define the inactivity timeout (e.g., 15 minutes) in milliseconds
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

interface EncryptionContextType {
  isLocked: boolean;
  unlockApp: (password: string) => boolean;
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
  // Always start locked
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // We're not clearing the key for now as requested
    // EncryptionService.clearKey();
    setIsLocked(true);
    setHasError(false); // Clear any errors when manually locking
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    console.log('[EncryptionProvider] App locked.');
  }, []);

  // Handle successful unlock
  const handleUnlockSuccess = useCallback(() => {
    setIsLocked(false);
    setHasError(false); // Clear errors on successful unlock
    resetInactivityTimer(); // Start timer on successful unlock
    console.log('[EncryptionProvider] App unlocked.');
  }, [resetInactivityTimer]);

  // Handle encryption errors by showing error
  const handleEncryptionError = useCallback((error: Error) => {
    setErrorMessage(error.message);
    setHasError(true);
    setIsLocked(true);
  }, []);

  // Simplified unlock function - directly calls setKeyFromPassword and uses verifyKey
  const contextUnlockApp = useCallback((password: string): boolean => {
    try {
      const verificationToken = localStorage.getItem('pandaai_encryption_verification');
      
      // First-time setup - always accept the password
      if (!verificationToken) {
        EncryptionService.setKeyFromPassword(password);
        handleUnlockSuccess();
        return true;
      }
      
      // Existing user - verify password first
      if (EncryptionService.verifyKey(password)) {
        EncryptionService.setKeyFromPassword(password);
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
    unlockApp: contextUnlockApp,
    lockApp,
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
             onUnlock={handleUnlockSuccess}
          />
        </>
      )}
      {/* Always render children with a key that changes when unlocked, forcing re-render */}
      <div 
        key={isLocked ? 'locked' : 'unlocked'} 
        style={{
          filter: isLocked ? 'blur(3px) brightness(0.8)' : 'none',
          transition: 'filter 0.5s ease-in-out',
          pointerEvents: isLocked ? 'none' : 'auto' // Prevent interaction with content when locked
        }}
      >
        {children}
      </div>
    </EncryptionContext.Provider>
  );
} 