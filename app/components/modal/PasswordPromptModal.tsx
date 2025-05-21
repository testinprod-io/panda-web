'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { EncryptionService } from '@/app/services/EncryptionService';
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
      const success = await unlockApp(password);

      if (success) {
        setPassword('');
      } else {
        setError('*Incorrect password');
      }
    } catch (err: any) {
      console.error('[PasswordPromptModal] Password error:', err);
      setError(`Error: ${err.message || 'Failed to process password'}`);
    }
  }, [password, unlockApp]);

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
      BackdropProps={{
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)', 
          backdropFilter: 'blur(5px)', 
          WebkitBackdropFilter: 'blur(5px)', 
        }
      }}
      PaperProps={{ 
        style: {
          backgroundColor: '#FFFFFF', 
          borderRadius: '8px', // Figma: borderRadius: 8
          paddingTop: '40px', // New top padding
          paddingBottom: '40px', // New bottom padding
          paddingLeft: '86px', // New left padding
          paddingRight: '86px', // New right padding
        }
      }}
    >
      {/* New Fixed-width Centered Inner Container */}
      <Box sx={{ width: '372px', margin: '0 auto', flexDirection: 'column', alignItems: 'center' }}>
        {/* Combined Title and Paragraph Block with Gap */}
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <Box sx={{
            width: '48px !important',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#F33D4F',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <img 
              src="/icons/lock.svg" 
              alt="Lock" 
              style={{ 
                width: '24px', 
                height: '30px',
                marginTop: '6px',
                filter: 'invert(100%) sepia(0%) saturate(7500%) hue-rotate(137deg) brightness(118%) contrast(91%)'
              }} 
            />
          </Box>
          <DialogTitle sx={{ textAlign: 'center', padding: 0 }}>
            <Typography variant="h5" component="div" sx={{ 
              color: '#131A28', // Figma: color: '#131A28'
              fontSize: '24px', // Figma: fontSize: 24
              fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
              fontWeight: '600', // Figma: fontWeight: '600'
              wordWrap: 'break-word'
            }}>
              Unlock Panda
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
              Please enter your password to decrypt your chat data.
            </Typography>
          </DialogContent>
        </Box>
        
        {/* Form Block (Input and Button) */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {error && (
            <Typography 
              variant="caption" // Or body2, adjust as needed
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px', 
                fontWeight: '400',
                color: '#F33D4F', // Using the same red as the error border
                textAlign: 'left',
                width: '100%',
                // The gap from the parent Box should provide spacing, adjust if needed
              }}
            >
              {error}
            </Typography>
          )}
          <TextField
            autoFocus
            required
            margin="none" // Remove default margin, using gap from parent Box
            id="password"
            type="password"
            fullWidth
            variant="outlined" 
            value={password}
            onChange={handlePasswordChange}
            error={!!error}
            // helperText={error} // Removed
            // InputLabelProps={{ style: { width: '100% !important', fontFamily: 'Inter, sans-serif' } }} // For consistency if label were used
            // FormHelperTextProps={{ // Removed
            //   style: {
            //     fontFamily: 'Inter, sans-serif',
            //     fontSize: '16px', 
            //     fontWeight: '400',
            //     marginLeft: 0, 
            //     textAlign: 'left', 
            //   }
            // }}
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
                  borderColor: '#F33D4F', // Default MUI error color for border
                }
              },
              '& .MuiInputBase-input': {
                width: '100% !important',
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
                background: password ? '#131A28' : '#F3F3F3', // Figma: background: '#F3F3F3'
                color: password ? '#C1FF83' : '#CACACA', // Figma: color: '#CACACA' (use for disabled), use darker for enabled
                borderRadius: '24px', // Figma: borderRadius: 24
                padding: '0 10px', // Figma: padding: 10 (adjust for vertical centering)
                textTransform: 'none', 
                fontSize: '16px', // Figma: fontSize: 16
                fontFamily: 'Inter, sans-serif', // Figma: fontFamily: 'Inter'
                fontWeight: '600', // Figma: fontWeight: '600'
                boxShadow: 'none',
                '&:hover': {
                //   background: password ? '#E5E5E5' : '#F3F3F3', // Darker on hover for enabled
                  boxShadow: 'none',
                },
                '&.Mui-disabled': { // Explicit styling for disabled state
                  background: '#F3F3F3',
                  color: '#CACACA',
                },
                marginTop: '8px',
              }}
            >
              Unlock
            </Button>
          </DialogActions>
        </Box>
      </Box> {/* End of New Fixed-width Centered Inner Container */}
    </Dialog>
  );
} 