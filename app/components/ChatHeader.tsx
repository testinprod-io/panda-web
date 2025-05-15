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
import styles from './chat-header.module.scss';
import clsx from 'clsx';

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
      className={styles.chatHeader}
    >
      <Box className={styles.headerLeft}>
        {isReady && isAuthenticated && isSidebarCollapsed && (
          <Tooltip title="Reveal Sidebar">
            <IconButton onClick={onRevealSidebar} className={styles.revealSidebarButton}>
              <img src="/icons/sidebar.svg" alt="Reveal Sidebar" style={{ width: '24px', height: '24px', color: '#1E1E1E' }} />
            </IconButton>
          </Tooltip>
        )}

        {isReady && isAuthenticated && currentSession() && currentModelConfig && (
          <Box className={styles.modelSelectorContainer}>
            <Button
              id="model-selector-button"
              aria-controls={modelMenuOpen ? 'model-selector-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={modelMenuOpen ? 'true' : undefined}
              onClick={handleModelClick}
              size="small"
              variant="text"
              endIcon={<ExpandMoreIcon />}
              className={styles.modelSelectorButton}
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
              className={styles.modelSelectorMenu}
            >
              {filteredModels.map((model) => (
                <MenuItem 
                  key={`${model.provider.id}-${model.name}`}
                  selected={model.name === currentModelConfig.model}
                  onClick={() => handleModelSelect(model.name as ModelType, model.provider.providerName as ServiceProvider)}
                  className={clsx(styles.modelMenuItem, model.name === currentModelConfig.model && styles.selected)}
                >
                  <ListItemText className={styles.modelMenuItemText} primary={model.displayName || model.name} />
                  {model.name === currentModelConfig.model && (
                    <ListItemIcon className={styles.checkIcon}>
                      <CheckIcon fontSize="small" />
                    </ListItemIcon>
                  )}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
      </Box>

      <Box className={styles.headerRight}>
        {!isReady ? (
          <Box className={styles.loadingPlaceholder} />
        ) : isAuthenticated ? (
          <>
            <Tooltip title={user?.email?.address || 'Profile'}>
               <Avatar 
                  className={styles.profileAvatar}
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
              className={styles.profileMenu}
            >
              <MenuItem
                onClick={handleLogout}
                className={styles.profileMenuItem}
              >
                <LogoutIcon className={styles.logoutIcon} />
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button 
            variant="outlined"
            onClick={login} 
            size="small"
            className={styles.loginButton}
          >
            Login / Sign Up
          </Button>
        )}
      </Box>
    </Box>
  );
} 