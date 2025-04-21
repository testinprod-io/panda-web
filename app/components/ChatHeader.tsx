"use client";

import { useState } from 'react';
import { Box, IconButton, Tooltip, Button, Avatar, Menu, MenuItem, FormControlLabel, Switch, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Person2RoundedIcon from '@mui/icons-material/Person2Rounded';
import LogoutIcon from '@mui/icons-material/Logout'; // Optional: Icon for logout
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStatus } from '@/app/hooks/useAuthStatus'; // Adjust path if necessary
import { useAppConfig } from '@/app/store'; // <-- Added import
import { ServiceProvider } from '@/app/constant'; // <-- Added import

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onRevealSidebar: () => void;
}

export default function ChatHeader({ isSidebarCollapsed, onRevealSidebar }: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { apiProvider, setApiProvider } = useAppConfig(); // <-- Get store state and action

  // State for the profile menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose(); // Close the menu first
    logout(); // Call Privy logout
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // Align items to start and end
        padding: '8px 16px', // Adjusted padding
        // borderBottom: '1px solid',
        borderColor: 'divider',
        height: '49px', // Match potential sidebar header height + border
        flexShrink: 0,
      }}
    >
      {/* Left side: Sidebar Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Conditionally render the sidebar toggle based on auth state */}
        {isReady && isAuthenticated && isSidebarCollapsed && (
          <Tooltip title="Reveal Sidebar">
            <IconButton onClick={onRevealSidebar} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}
        {/* You can add a title or logo here if needed */}
      </Box>

      {/* Right side: Auth Button / User Profile */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!isReady ? (
          // Optional: Show a loading state while Privy initializes
          <Box sx={{ width: 80, height: 36 }} /> // Placeholder for button size
        ) : isAuthenticated ? (
          <>
            <Tooltip title={user?.email?.address || 'Profile'}>
               <Avatar 
                  sx={{ width: 40, height: 40, cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)' }} 
                  onClick={handleClick} // Open menu on click
                  aria-controls={open ? 'profile-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
               >
                  {user?.email?.address ? user.email.address.charAt(0).toUpperCase() : <Person2RoundedIcon />}
               </Avatar>
            </Tooltip>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '8px',
                  marginTop: '8px',
                  minWidth: 180,
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                },
              }}
            >
              {/* API Provider Toggle */}
              <MenuItem 
                // Prevent menu close on switch click
                onClick={(e) => e.stopPropagation()}
                sx={{ 
                  padding: '0px 16px', // Adjust padding
                  '&:hover': { backgroundColor: 'transparent' } // Disable hover effect on item itself
                 }}
              >
                <FormControlLabel
                  control={
                    <Switch 
                      checked={apiProvider === ServiceProvider.Panda}
                      onChange={(event) => {
                        const newProvider = event.target.checked ? ServiceProvider.Panda : ServiceProvider.OpenAI;
                        setApiProvider(newProvider);
                        // Optionally close menu after selection, or keep it open
                        // handleClose(); 
                      }}
                      size="small"
                      sx={{ 
                        marginLeft: 'auto', // Push switch to the right
                       }}
                    />
                  }
                  labelPlacement="start" // Label on the left
                  label={
                     <Typography variant="body2" sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Use Panda Backend
                    </Typography>
                  }
                  sx={{ 
                    justifyContent: 'space-between', // Space out label and switch
                    width: '100%', 
                    marginLeft: 0, // Reset margin
                    padding: '8px 0px', // Add padding inside the item
                  }}
                />
              </MenuItem>

              {/* Logout Button */}
              <MenuItem
                onClick={handleLogout}
                sx={{
                  '&:hover': {
                    backgroundColor: 'var(--bg-hover)',
                  },
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: '1.1rem', color: 'var(--text-secondary)' }} />
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          // Not Authenticated: Show Login button
          <Button 
            variant="outlined"
            onClick={login} 
            size="small"
            sx={{
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
              textTransform: 'none',
              borderRadius: '8px',
              padding: '4px 12px',
              '&:hover': {
                backgroundColor: 'var(--bg-hover)',
                borderColor: 'var(--border-secondary)',
              },
            }}
          >
            Login / Sign Up
          </Button>
        )}
      </Box>
    </Box>
  );
} 