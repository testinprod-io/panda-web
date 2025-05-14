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
import { useEncryption } from '@/app/context/EncryptionProvider';

interface PasswordPromptModalProps {
  open: boolean;
}

export function PasswordPromptModal({ open }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const { unlockApp } = useEncryption();

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setError(''); // Clear error when typing
  };

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }

    try {
      // Existing users - verify password via context
      console.log('[PasswordPromptModal] Verifying existing password via context unlockApp');
      const success = unlockApp(password);

      if (success) {
        setPassword('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      console.error('[PasswordPromptModal] Password error:', err);
      setError(`Error: ${err.message || 'Failed to process password'}`);
    }
  }, [password, unlockApp]);

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
          backgroundColor: 'rgba(0, 0, 0, 0.1)', 
          backdropFilter: 'blur(5px)', 
          WebkitBackdropFilter: 'blur(5px)', 
        }
      }}
      PaperProps={{ 
        style: {
          backgroundColor: '#FFFFFF', 
          borderRadius: '8px', // Figma: borderRadius: 8
          boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.1)', 
          padding: '24px', // General padding, specific gaps handled below
        }
      }}
    >
      {/* Combined Title and Paragraph Block with Gap */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
        <DialogTitle sx={{ textAlign: 'center', padding: 0 }}>
          <Typography variant="h5" component="div" sx={{ 
            color: '#131A28', // Figma: color: '#131A28'
            fontSize: '24px', // Figma: fontSize: 24
            fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
            fontWeight: '600', // Figma: fontWeight: '600'
            wordWrap: 'break-word'
          }}>
            Unlock Data Encryption
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', padding: 0 }}>
          <Typography variant="body1" sx={{ // body1 is 16px by default, adjust if needed
            color: '#131A28', // Figma: color: '#131A28'
            fontSize: '16px', // Figma: fontSize: 16
            fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
            fontWeight: '400', // Figma: fontWeight: '400'
            wordWrap: 'break-word'
          }}>
            Please enter your password to decrypt your chat data. This password is only stored temporarily in your browser\'s memory.
          </Typography>
        </DialogContent>
      </Box>
      
      <form onSubmit={handleSubmit}>
        {/* Input and Button Block with Gap */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <TextField
            autoFocus
            required
            margin="none" // Remove default margin, using gap from parent Box
            id="password"
            placeholder="Password" 
            type="password"
            fullWidth
            variant="outlined" 
            value={password}
            onChange={handlePasswordChange}
            error={!!error}
            helperText={error}
            InputLabelProps={{ style: { fontFamily: 'Inter, sans-serif' } }} // For consistency if label were used
            FormHelperTextProps={{
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px', // Figma shows 16px for error, but typically helper is smaller. Let's use 14px for now.
                // color: '#D32F2F' // MUI default error color
                marginLeft: 0, // Align with input
                textAlign: 'left', // Align error text to the left as is common
              }
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px', // Figma: borderRadius: 8
                backgroundColor: 'white', // Figma: background: 'white'
                height: '56px', // Figma: height: 56
                fontFamily: 'Inter, sans-serif',
                '& fieldset': {
                  borderColor: '#CACACA', // Figma: outline: '1px #CACACA solid'
                },
                '&:hover fieldset': {
                  borderColor: '#A0A0A0', // Darker shade for hover
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#007AFF', 
                },
                '&.Mui-error fieldset': {
                  borderColor: '#D32F2F', // Default MUI error color for border
                }
              },
              '& .MuiInputBase-input': {
                padding: '0 14px', // Adjusted padding to vertically center text in 56px height
                height: '100%', // Ensure input takes full height of MuiOutlinedInput-root
                color: '#131A28', // Figma: color: '#131A28' (for text inside input)
                fontSize: '16px', // Figma: fontSize: 16
                fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
                fontWeight: '400', // Figma: fontWeight: '400'
                '&::placeholder': {
                  // color: '#757575', // A typical placeholder color
                  opacity: 1, // Ensure placeholder is visible
                }
              }
            }}
          />
          <DialogActions sx={{ padding: 0, width: '100%' }}>
            {/* Debug button hidden for this styling pass, can be re-added if needed */}
            {/* {debugMode && (
              <Button onClick={runEncryptionTest} variant="outlined" color="secondary" sx={{ marginRight: '8px', borderRadius: '12px' }}>
                Test Encryption
              </Button>
            )} */}
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!password}
              fullWidth 
              sx={{
                height: '48px', // Figma: height: 48
                background: '#F3F3F3', // Figma: background: '#F3F3F3'
                color: password ? '#131A28' : '#CACACA', // Figma: color: '#CACACA' (use for disabled), use darker for enabled
                borderRadius: '24px', // Figma: borderRadius: 24
                padding: '0 10px', // Figma: padding: 10 (adjust for vertical centering)
                textTransform: 'none', 
                fontSize: '16px', // Figma: fontSize: 16
                fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
                fontWeight: '600', // Figma: fontWeight: '600'
                boxShadow: 'none',
                '&:hover': {
                  background: password ? '#E5E5E5' : '#F3F3F3', // Darker on hover for enabled
                  boxShadow: 'none',
                },
                '&.Mui-disabled': { // Explicit styling for disabled state
                  background: '#F3F3F3',
                  color: '#CACACA',
                }
              }}
            >
              Unlock
            </Button>
          </DialogActions>
        </Box>
      </form>
    </Dialog>
  );
} 