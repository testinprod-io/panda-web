'use client'

import React, { useState, useCallback, useEffect } from 'react';
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
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setError(''); // Clear error when typing
  };

  // Check if this is first-time setup (no verification token in localStorage)
  useEffect(() => {
    const verificationToken = localStorage.getItem('pandaai_encryption_verification');
    setIsFirstTimeSetup(!verificationToken);
  }, []);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    try {
      // First-time setup - accept any password
      if (isFirstTimeSetup) {
        console.log('[PasswordPromptModal] First-time setup, setting new password');
        EncryptionService.setKeyFromPassword(password);
        setPassword('');
        onUnlock();
        return;
      }

      // Existing users - verify password
      console.log('[PasswordPromptModal] Verifying existing password');
      if (EncryptionService.verifyKey(password)) {
        // If verification succeeds, set the key for active use
        EncryptionService.setKeyFromPassword(password);
        setPassword('');
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (error: any) {
      console.error('[PasswordPromptModal] Password error:', error);
      setError(`Error: ${error.message || 'Failed to process password'}`);
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

  // Enable debug mode with shift+alt+d keypress
  useEffect(() => {
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
    <Dialog 
      open={open} 
      disableEscapeKeyDown 
      fullWidth 
      maxWidth="xs"
      BackdropProps={{
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }
      }}
      PaperProps={{ 
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LockOpenIcon />
          {isFirstTimeSetup ? 'Create Encryption Password' : 'Unlock Data Encryption'}
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
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