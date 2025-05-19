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
import { ModelConfig, DEFAULT_MODELS } from '@/app/constant';
import LoginSignupPopup from './LoginSignupPopup';
import styles from './chat-header.module.scss';
import clsx from 'clsx';

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onRevealSidebar: () => void;
  isMobile?: boolean;
}

export default function ChatHeader({ isSidebarCollapsed, onRevealSidebar, isMobile }: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider } = useAppConfig();

  const activeSessionModelName = useChatStore(state => state.currentSession()?.modelConfig?.name);
  const activeSessionModelDisplayName = useChatStore(state => state.currentSession()?.modelConfig?.displayName);

  const globalModelIdentifier = useAppConfig(state => state.modelConfig.model);
  const globalModelName = useAppConfig(state => state.modelConfig.name);
  const globalModelDisplayName = useAppConfig(state => state.modelConfig.displayName);

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

  const handleModelSelect = (modelName: ModelType) => {
    console.log("handleModelSelect", modelName);
    const selectedModelDetails = availableModels.find(m => m.name === modelName);
    console.log("selectedModelDetails", selectedModelDetails);
    if (selectedModelDetails && selectedModelDetails.available) {
      console.log("setting api provider", selectedModelDetails.provider.providerName);
      setApiProvider(modelName);
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

  const displayModelName = 
    activeSessionModelDisplayName || 
    activeSessionModelName || 
    globalModelDisplayName || 
    globalModelName || 
    DEFAULT_MODELS[0].config.displayName;

  const currentModelNameForSelectionLogic = activeSessionModelName || globalModelIdentifier;

  const modelsToDisplay = useMemo(() => {
    return availableModels;
  }, [availableModels]);

  console.log("activeSessionModelName:", activeSessionModelName);
  console.log("activeSessionModelDisplayName:", activeSessionModelDisplayName);
  console.log("globalModelIdentifier:", globalModelIdentifier);
  console.log("displayModelName used in UI:", displayModelName);

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

        {isReady && isAuthenticated && (
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
              {displayModelName}
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
                const isSelected = model.name === currentModelNameForSelectionLogic;
                const isActuallyAvailable = model.available;

                return (
                  <MenuItem 
                    key={`${model.provider.id}-${model.name}`}
                    onClick={() => {
                      handleModelSelect(model.name as ModelType)
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