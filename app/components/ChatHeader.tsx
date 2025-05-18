"use client";

import { useState, useMemo } from 'react';
import { Box, IconButton, Tooltip, Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import Person2RoundedIcon from '@mui/icons-material/Person2Rounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import { useAppConfig, useChatStore } from '@/app/store';
import { ServiceProvider } from '@/app/constant';
import { ModelType } from '@/app/store/config';
import LoginSignupPopup from './LoginSignupPopup';
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

  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

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

  const handleModelSelect = (modelName: ModelType, providerName: ServiceProvider) => {
    const selectedModelDetails = availableModels.find(m => m.name === modelName && m.provider.providerName === providerName);
    if (selectedModelDetails && selectedModelDetails.available) {
      setApiProvider(modelName, providerName);
    }
    handleModelClose();
  };

  const handleOpenLoginPopup = () => {
    setIsLoginPopupOpen(true);
  };

  const handleCloseLoginPopup = () => {
    setIsLoginPopupOpen(false);
  };

  const handlePopupLogin = () => {
    login();
  };

  const handlePopupSignup = () => {
    login();
  };

  const currentModelConfig = currentSession()?.modelConfig;

  const modelsToDisplay = useMemo(() => {
    return availableModels;
  }, [availableModels]);

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
              {modelsToDisplay.map((model) => {
                const isSelected = model.name === currentModelConfig.model && model.provider.providerName === currentModelConfig.providerName;
                const isActuallyAvailable = model.available;

                return (
                  <MenuItem 
                    key={`${model.provider.id}-${model.name}`}
                    onClick={() => {
                      if (isActuallyAvailable) {
                        handleModelSelect(model.name as ModelType, model.provider.providerName as ServiceProvider)
                      }
                    }}
                    className={clsx(
                      styles.modelMenuItem, 
                      isSelected && isActuallyAvailable && styles.selected,
                      !isActuallyAvailable && styles.unavailable
                    )}
                    disabled={!isActuallyAvailable}
                  >
                    <ListItemText 
                      primary={model.displayName || model.name} 
                      className={styles.modelMenuItemText}
                    />
                    <Box className={styles.iconContainer}>
                      {isSelected && isActuallyAvailable && (
                        <img src="/icons/check.svg" alt="Selected" style={{ width: '24px', height: '24px' }} />
                      )}
                      {!isActuallyAvailable && (
                        <WarningAmberOutlinedIcon className={styles.warningIcon} />
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
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
              <Box className={styles.profileMenuUserSection}>
                <Avatar 
                  className={styles.profileMenuAvatar}
                >
                  {user?.email?.address ? user.email.address.charAt(0).toUpperCase() : <Person2RoundedIcon />}
                </Avatar>
                <ListItemText 
                  primary={user?.wallet?.address || user?.email?.address || "test@example.com"} 
                  className={styles.profileMenuText} 
                  primaryTypographyProps={{ style: { /* overflow: 'hidden', textOverflow: 'ellipsis' */ } }}
                />
              </Box>
              <Box className={styles.profileMenuCompanySection}>
                <ListItemText 
                  primary="Company name is very lonoooooooooooooooooooooooooooog case" 
                  className={styles.profileMenuText}
                  primaryTypographyProps={{ style: { /* overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' */ } }}
                />
              </Box>
              <Divider className={styles.profileMenuDivider} />
              <MenuItem
                onClick={() => { /* Placeholder for Help & FAQ */ handleProfileClose(); }}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img src="/icons/help.svg" alt="Help & FAQ" className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText primary="Help & FAQ" className={styles.profileMenuTextItem} />
              </MenuItem>
              <MenuItem
                onClick={() => { /* Placeholder for Settings */ handleProfileClose(); }}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img src="/icons/settings.svg" alt="Settings" className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText primary="Settings" className={styles.profileMenuTextItem} />
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img src="/icons/logout.svg" alt="Logout" className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText primary="Log out" className={styles.profileMenuTextItem} />
              </MenuItem>
            </Menu>
          </>
        ) : (
          <>
            <Button 
              variant="contained"
              onClick={handleOpenLoginPopup}
              size="small"
              className={styles.loginButtonNew}
            >
              Log in
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleOpenLoginPopup}
              size="small"
              className={styles.signUpButtonNew}
              style={{ marginLeft: '8px' }}
            >
              Sign up
            </Button>
          </>
        )}
      </Box>
      <LoginSignupPopup
        open={isLoginPopupOpen}
        onClose={handleCloseLoginPopup}
        onLogin={handlePopupLogin} 
        onSignup={handlePopupSignup}
      />
    </Box>
  );
} 