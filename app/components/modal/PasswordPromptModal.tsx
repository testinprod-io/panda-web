'use client'

import React, { useState, useCallback } from 'react';
import { EncryptionService, testEncryption } from '@/app/services/EncryptionService';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LockOpenIcon from '@mui/icons-material/LockOpen';

interface PasswordPromptModalProps {
  open: boolean;
  onUnlock: () => void; // Callback when successfully unlocked
}

export function PasswordPromptModal({ open, onUnlock }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false); // Track if this is first setup
  const [debugMode, setDebugMode] = useState(false);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setError(''); // Clear error when typing
  };

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    try {
      console.log('[PasswordPromptModal] Attempting to set key...');
      EncryptionService.setKeyFromPassword(password);

      // If this is the first time setup, we just accept any valid password
      if (isFirstTimeSetup) {
        // Run a self-test to make sure encryption works
        try {
          const testText = "Test encryption with new password";
          const encrypted = EncryptionService.encrypt(testText);
          const decrypted = EncryptionService.decrypt(encrypted);
          
          if (decrypted !== testText) {
            throw new Error("Encryption test failed - decrypted text doesn't match original");
          }
          
          console.log('[PasswordPromptModal] First-time setup successful. New encryption password set.');
          localStorage.setItem('pandaai-encryption-initialized', 'true');
          setPassword(''); // Clear password field
          setError('');
          onUnlock(); // Trigger the unlock callback
        } catch (testError) {
          console.error('[PasswordPromptModal] Encryption test failed:', testError);
          setError('Failed to set up encryption. Please try a different password.');
          EncryptionService.clearKey();
        }
        return;
      }

      // For existing users, verify the key can decrypt properly
      try {
        if (EncryptionService.verifyKey()) {
          console.log('[PasswordPromptModal] Password verified successfully.');
          setPassword(''); // Clear password field
          setError('');
          onUnlock(); // Trigger the unlock callback
          return;
        } else {
          throw new Error("Verification failed");
        }
      } catch (verifyError) {
        console.error('[PasswordPromptModal] Password verification failed:', verifyError);
        setError('Incorrect password. Please try again.');
        EncryptionService.clearKey(); // Clear key if verification fails
      }
    } catch (error: any) {
      console.error('[PasswordPromptModal] Error setting encryption key:', error);
      setError(`Error: ${error.message || 'Failed to process password'}`);
      EncryptionService.clearKey();
    }
  }, [password, onUnlock, isFirstTimeSetup]);

  // Debug function - only for development
  const runEncryptionTest = useCallback(() => {
    try {
      testEncryption();
      setError('Test complete - check console for results');
    } catch (e) {
      console.error("Encryption test error:", e);
      setError(`Test failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // Check if this appears to be the first time setup
  React.useEffect(() => {
    const hasSetupBefore = localStorage.getItem('pandaai-encryption-initialized');
    setIsFirstTimeSetup(!hasSetupBefore);
    
    // Enable debug mode with shift+alt+d keypress
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        console.log('Debug mode:', !debugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  return (
    <Dialog open={open} disableEscapeKeyDown fullWidth maxWidth="xs">
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LockOpenIcon />
          {isFirstTimeSetup ? 'Create Encryption Password' : 'Unlock Data Encryption'}
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}> {/* Wrap content in form */} 
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {isFirstTimeSetup 
              ? 'Please create a password to encrypt your chat data. Remember this password as it cannot be recovered!'
              : 'Please enter your password to decrypt your chat data. This password is only stored temporarily in your browser\'s memory.'}
          </Typography>
          <TextField
            autoFocus
            required
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={handlePasswordChange}
            error={!!error}
            helperText={error}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          {debugMode && (
            <Button onClick={runEncryptionTest} variant="outlined" color="secondary">
              Test Encryption
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={!password}>
            {isFirstTimeSetup ? 'Create & Unlock' : 'Unlock'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 