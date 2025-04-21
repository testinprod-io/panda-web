"use client";

import { useState, useMemo } from 'react';
import { Box, IconButton, Tooltip, Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Person2RoundedIcon from '@mui/icons-material/Person2Rounded';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import { useAppConfig, useChatStore } from '@/app/store';
import { ServiceProvider } from '@/app/constant';
import { ModelType } from '@/app/store/config';

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onRevealSidebar: () => void;
}

export default function ChatHeader({ isSidebarCollapsed, onRevealSidebar }: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider } = useAppConfig();
  const { currentSession, updateCurrentSessionModel } = useChatStore();

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchorEl);

  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelAnchorEl);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };
  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleModelClick = (event: React.MouseEvent<HTMLElement>) => {
    setModelAnchorEl(event.currentTarget);
  };

  const handleModelClose = () => {
    setModelAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileClose();
    logout();
  };

  const handleModelSelect = (model: ModelType, provider: ServiceProvider) => {
    setApiProvider(model, provider);
    handleModelClose();
  };

  const currentModelConfig = currentSession()?.modelConfig;

  const filteredModels = useMemo(() => {
    if (!currentModelConfig) return [];
    const currentProviderName = currentModelConfig.providerName;
    return availableModels.filter(
      (m) => m.available,
    );
  }, [availableModels, currentModelConfig]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderColor: 'divider',
        height: '49px',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isReady && isAuthenticated && isSidebarCollapsed && (
          <Tooltip title="Reveal Sidebar">
            <IconButton onClick={onRevealSidebar} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}

        {isReady && isAuthenticated && currentSession() && currentModelConfig && (
          <Box sx={{ mr: 1 }}>
            <Button
              id="model-selector-button"
              aria-controls={modelMenuOpen ? 'model-selector-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={modelMenuOpen ? 'true' : undefined}
              onClick={handleModelClick}
              size="small"
              variant="text"
              endIcon={<ExpandMoreIcon />}
              sx={{ 
                textTransform: 'none', 
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {currentModelConfig.model}
            </Button>
            <Menu
              id="model-selector-menu"
              anchorEl={modelAnchorEl}
              open={modelMenuOpen}
              onClose={handleModelClose}
              MenuListProps={{
                'aria-labelledby': 'model-selector-button',
              }}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              sx={{
                 '& .MuiPaper-root': {
                   borderRadius: '8px',
                   marginTop: '8px',
                   minWidth: 220,
                   boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                   backgroundColor: 'var(--bg-secondary)',
                   color: 'var(--text-primary)',
                 },
              }}
            >
              {filteredModels.map((model) => (
                <MenuItem 
                  key={`${model.provider.id}-${model.name}`}
                  selected={model.name === currentModelConfig.model}
                  onClick={() => handleModelSelect(model.name as ModelType, model.provider.providerName as ServiceProvider)}
                  sx={{ 
                    fontSize: '0.9rem', 
                    padding: '6px 16px',
                    backgroundColor: model.name === currentModelConfig.model ? 'var(--bg-selected)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                    },
                   }}
                >
                  <ListItemText primary={model.displayName || model.name} />
                  {model.name === currentModelConfig.model && (
                    <ListItemIcon sx={{ minWidth: 'auto', marginLeft: 'auto', paddingLeft: '16px' }}>
                      <CheckIcon fontSize="small" sx={{ color: 'var(--accent-color)' }} />
                    </ListItemIcon>
                  )}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {!isReady ? (
          <Box sx={{ width: 80, height: 36 }} />
        ) : isAuthenticated ? (
          <>
            <Tooltip title={user?.email?.address || 'Profile'}>
               <Avatar 
                  sx={{ width: 40, height: 40, cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)' }} 
                  onClick={handleProfileClick}
                  aria-controls={profileMenuOpen ? 'profile-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={profileMenuOpen ? 'true' : undefined}
               >
                  {user?.email?.address ? user.email.address.charAt(0).toUpperCase() : <Person2RoundedIcon />}
               </Avatar>
            </Tooltip>
            <Menu
              id="profile-menu"
              anchorEl={profileAnchorEl}
              open={profileMenuOpen}
              onClose={handleProfileClose}
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