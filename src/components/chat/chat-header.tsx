"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Button,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import Person2RoundedIcon from "@mui/icons-material/Person2Rounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAppConfig, useChatStore } from "@/store";
import { DEFAULT_MODELS, ModelType } from "@/types/constant";
import LoginSignupPopup from "../login/login-signup-popup";
import styles from "./chat-header.module.scss";
import clsx from "clsx";
import { useRouter } from "next/navigation";

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

type EncryptionStatus = "SUCCESSFUL" | "FAILED" | "IN_PROGRESS";

export default function ChatHeader({
  isSidebarCollapsed,
  onToggleSidebar,
  isMobile,
}: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider } = useAppConfig();

  const activeSessionModelName = useChatStore(
    (state) => state.currentSession()?.modelConfig?.name,
  );
  const activeSessionModelDisplayName = useChatStore(
    (state) => state.currentSession()?.modelConfig?.displayName,
  );

  const globalModelIdentifier = useAppConfig(
    (state) => state.modelConfig.model,
  );
  const globalModelName = useAppConfig((state) => state.modelConfig.name);
  const globalModelDisplayName = useAppConfig(
    (state) => state.modelConfig.displayName,
  );

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const profileMenuOpen = Boolean(profileAnchorEl);

  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelAnchorEl);

  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  const [encryptionStatus, setEncryptionStatus] =
    useState<EncryptionStatus>("SUCCESSFUL");

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
    const selectedModelDetails = availableModels.find(
      (m) => m.name === modelName,
    );
    if (selectedModelDetails && selectedModelDetails.available) {
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

  const router = useRouter();
  const store = useChatStore();

  const handleNewChat = () => {
    store.setCurrentSessionIndex(-1);
    router.push(`/`);
  };

  const displayModelName =
    activeSessionModelDisplayName ||
    activeSessionModelName ||
    globalModelDisplayName ||
    globalModelName ||
    DEFAULT_MODELS[0].config.displayName;

  const currentModelNameForSelectionLogic =
    activeSessionModelName || globalModelIdentifier;

  const modelsToDisplay = availableModels;

  const cycleEncryptionStatus = () => {
    setEncryptionStatus((prevStatus) => {
      if (prevStatus === "SUCCESSFUL") return "IN_PROGRESS";
      if (prevStatus === "IN_PROGRESS") return "FAILED";
      return "SUCCESSFUL";
    });
  };

  const getEncryptionStatusInfo = () => {
    switch (encryptionStatus) {
      case "SUCCESSFUL":
        return {
          text: "Encryption Activated",
          statusClass: styles.encryptionStatusSuccessful,
          icon: "/icons/lock.svg",
        };
      case "FAILED":
        return {
          text: "Encryption Failed",
          statusClass: styles.encryptionStatusFailed,
          icon: "/icons/lock.svg",
        };
      case "IN_PROGRESS":
        return {
          text: "Encryption Activating",
          statusClass: styles.encryptionStatusInProgress,
          icon: "/icons/lock.svg",
        };
      default:
        return {
          text: "Status Unknown",
          statusClass: styles.encryptionStatusUnknown,
          icon: "/icons/lock.svg",
        };
    }
  };

  const currentStatusInfo = getEncryptionStatusInfo();

  const handleOpenSettings = () => {
    // Attempt to blur the currently focused element (likely the clicked menu item)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleProfileClose(); // Close the profile menu first

    requestAnimationFrame(() => {
      window.location.hash = "settings"; // Directly set the hash
    });
  };

  return (
    <Box className={styles.chatHeader}>
      <Box className={styles.headerLeft}>
        {isReady && isAuthenticated && isSidebarCollapsed && isMobile && (
          <>
            <Tooltip title="Reveal Sidebar">
              <IconButton
                onClick={onToggleSidebar}
                className={styles.revealSidebarButton}
              >
                <img
                  src="/icons/sidebar.svg"
                  alt="Reveal Sidebar"
                  className={styles.headerActionIconImg}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="New Chat">
              <IconButton
                onClick={handleNewChat}
                className={styles.newChatButton}
              >
                <img
                  src="/icons/new-chat.svg"
                  alt="New Chat"
                  className={styles.headerActionIconImg}
                />
              </IconButton>
            </Tooltip>
          </>
        )}

        {isReady && isAuthenticated && (
          <Box className={styles.modelSelectorContainer}>
            <Button
              id="model-selector-button"
              aria-controls={modelMenuOpen ? "model-selector-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={modelMenuOpen ? "true" : undefined}
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
                "aria-labelledby": "model-selector-button",
              }}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              className={styles.modelSelectorMenu}
            >
              {modelsToDisplay.map((model) => {
                const isSelected =
                  model.name === currentModelNameForSelectionLogic;
                const isActuallyAvailable = model.available;

                return (
                  <MenuItem
                    key={`${model.provider.id}-${model.name}`}
                    onClick={() => {
                      handleModelSelect(model.name as ModelType);
                    }}
                    className={clsx(
                      styles.modelMenuItem,
                      isSelected && isActuallyAvailable && styles.selected,
                      !isActuallyAvailable && styles.unavailable,
                    )}
                    disabled={!isActuallyAvailable}
                  >
                    <ListItemText
                      primary={model.displayName || model.name}
                      className={styles.modelMenuItemText}
                    />
                    <Box className={styles.iconContainer}>
                      {isSelected && isActuallyAvailable && (
                        <img src="/icons/check.svg" alt="Selected" />
                      )}
                      {!isActuallyAvailable && (
                        <WarningAmberOutlinedIcon
                          className={styles.warningIcon}
                        />
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
        {isAuthenticated && (
              <Tooltip title="Click to cycle status (Dev only)">
                <Box
                  onClick={cycleEncryptionStatus}
                  className={clsx(
                    styles.encryptionStatus,
                    currentStatusInfo.statusClass,
                  )}
                  sx={{ cursor: "pointer" }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={currentStatusInfo.icon}
                      alt="status icon"
                      className={styles.encryptionStatusIconImg}
                    />
                  </Box>
                  <Typography className={styles.encryptionStatusText}>
                    {currentStatusInfo.text}
                  </Typography>
                </Box>
              </Tooltip>
            )}
        {!isReady ? (
          <Box className={styles.loadingPlaceholder} />
        ) : isAuthenticated ? (
          <>
            <Tooltip title={user?.email?.address || "Profile"}>
              <Avatar
                className={styles.profileAvatar}
                onClick={handleProfileClick}
                aria-controls={profileMenuOpen ? "profile-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen ? "true" : undefined}
              >
                {user?.email?.address ? (
                  user.email.address.charAt(0).toUpperCase()
                ) : (
                  <Person2RoundedIcon />
                )}
              </Avatar>
            </Tooltip>
            <Menu
              id="profile-menu"
              anchorEl={profileAnchorEl}
              open={profileMenuOpen}
              onClose={handleProfileClose}
              MenuListProps={{
                "aria-labelledby": "basic-button",
              }}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              className={styles.profileMenu}
            >
              <Box className={styles.profileMenuUserSection}>
                <Avatar className={styles.profileMenuAvatar}>
                  {user?.email?.address ? (
                    user.email.address.charAt(0).toUpperCase()
                  ) : (
                    <Person2RoundedIcon />
                  )}
                </Avatar>
                <ListItemText
                  primary={
                    user?.wallet?.address ||
                    user?.email?.address ||
                    "test@example.com"
                  }
                  className={styles.profileMenuText}
                />
              </Box>
              <Divider className={styles.profileMenuDivider} />
              <MenuItem
                onClick={() => {
                  handleProfileClose();
                }}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img
                    src="/icons/help.svg"
                    alt="Help & FAQ"
                    className={styles.profileMenuIcon}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Help & FAQ"
                  className={styles.profileMenuTextItem}
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenSettings();
                }}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img
                    src="/icons/settings.svg"
                    alt="Settings"
                    className={styles.profileMenuIcon}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Settings"
                  className={styles.profileMenuTextItem}
                />
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <img
                    src="/icons/logout.svg"
                    alt="Logout"
                    className={styles.profileMenuIcon}
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Log out"
                  className={styles.profileMenuTextItem}
                />
              </MenuItem>
            </Menu>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              onClick={handleOpenLoginPopup}
              size="small"
              className={styles.loginButton}
            >
              Log in/Sign up
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
