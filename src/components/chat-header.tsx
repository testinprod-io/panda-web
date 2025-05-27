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
import { ServiceProvider } from "@/types/constant";
import { ModelType } from "@/store/config";
import { ModelConfig, DEFAULT_MODELS } from "@/types/constant";
import LoginSignupPopup from "./login-signup-popup";
import styles from "./chat-header.module.scss";
import clsx from "clsx";
import { useRouter } from "next/navigation";

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onRevealSidebar: () => void;
  isMobile?: boolean;
}

// Define Encryption Status Type
type EncryptionStatus = "SUCCESSFUL" | "FAILED" | "IN_PROGRESS";

export default function ChatHeader({
  isSidebarCollapsed,
  onRevealSidebar,
  isMobile,
}: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider } = useAppConfig();

  const activeSessionModelName = useChatStore(
    (state) => state.currentSession()?.modelConfig?.name
  );
  const activeSessionModelDisplayName = useChatStore(
    (state) => state.currentSession()?.modelConfig?.displayName
  );

  const globalModelIdentifier = useAppConfig(
    (state) => state.modelConfig.model
  );
  const globalModelName = useAppConfig((state) => state.modelConfig.name);
  const globalModelDisplayName = useAppConfig(
    (state) => state.modelConfig.displayName
  );

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const profileMenuOpen = Boolean(profileAnchorEl);

  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelAnchorEl);

  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  // Encryption Status State
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
    console.log("handleModelSelect", modelName);
    const selectedModelDetails = availableModels.find(
      (m) => m.name === modelName
    );
    console.log("selectedModelDetails", selectedModelDetails);
    if (selectedModelDetails && selectedModelDetails.available) {
      console.log(
        "setting api provider",
        selectedModelDetails.provider.providerName
      );
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

  console.log("activeSessionModelName:", activeSessionModelName);
  console.log("activeSessionModelDisplayName:", activeSessionModelDisplayName);
  console.log("globalModelIdentifier:", globalModelIdentifier);
  console.log("globalModelName:", globalModelName);
  console.log("globalModelDisplayName:", globalModelDisplayName);
  console.log("DEFAULT_MODELS[0].config.displayName:", DEFAULT_MODELS[0].config.displayName);

  const displayModelName =
    activeSessionModelDisplayName ||
    activeSessionModelName ||
    globalModelDisplayName ||
    globalModelName ||
    DEFAULT_MODELS[0].config.displayName;

  const currentModelNameForSelectionLogic =
    activeSessionModelName || globalModelIdentifier;

  const modelsToDisplay = useMemo(() => {
    return availableModels;
  }, [availableModels]);

  // Cycle through encryption states for demo
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
          bgColor: "#C1FF83",
          textColor: "#131A28",
          icon: "/icons/lock.svg", // Assuming lock.svg is now black
        };
      case "FAILED":
        return {
          text: "Encryption Failed",
          bgColor: "#FFC0CB", // Light Pink/Red for failure
          textColor: "#8B0000", // Dark Red
          icon: "/icons/lock.svg", // Placeholder, consider a warning icon
                                     // If using lock, may need filter to change color if bg is dark
        };
      case "IN_PROGRESS":
        return {
          text: "Encryption Activating",
          bgColor: "#ADD8E6", // Light Blue for in progress
          textColor: "#00008B", // Dark Blue
          icon: "/icons/lock.svg", // Placeholder, consider a spinner or different lock state
        };
      default: // Should not happen
        return {
          text: "Status Unknown",
          bgColor: "#D3D3D3", // Light Gray
          textColor: "black",
          icon: "/icons/lock.svg",
        };
    }
  };

  const currentStatusInfo = getEncryptionStatusInfo();

  console.log("activeSessionModelName:", activeSessionModelName);
  console.log("activeSessionModelDisplayName:", activeSessionModelDisplayName);
  console.log("globalModelIdentifier:", globalModelIdentifier);
  console.log("displayModelName used in UI:", displayModelName);

  const handleOpenSettings = () => {
    // Attempt to blur the currently focused element (likely the clicked menu item)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleProfileClose(); // Close the profile menu first

    requestAnimationFrame(() => {
      window.location.hash = 'settings'; // Directly set the hash
    });
  };

  return (
    <Box className={styles.chatHeader}>
      <Box className={styles.headerLeft}>
        {isReady && isAuthenticated && (isSidebarCollapsed || isMobile) && (
          <>
            <Tooltip title="Reveal Sidebar">
              <IconButton
                onClick={onRevealSidebar}
                className={styles.revealSidebarButton}
              >
                <img
                  src="/icons/sidebar.svg"
                  alt="Reveal Sidebar"
                  style={{ width: "24px", height: "24px", filter: 'invert(9%) sepia(0%) saturate(0%) hue-rotate(134deg) brightness(94%) contrast(92%)' }}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="New Chat">
              <IconButton
                onClick={handleNewChat}
                className={styles.newChatButton}
              >
                <img
                  src="/icons/new_chat.svg"
                  alt="New Chat"
                  style={{ width: "24px", height: "24px", filter: 'invert(9%) sepia(0%) saturate(0%) hue-rotate(134deg) brightness(94%) contrast(92%)' }}
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
                        <img
                          src="/icons/check.svg"
                          alt="Selected"
                          style={{ width: "24px", height: "24px" }}
                        />
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
            {/* Encryption Status Display - Placed after model selector */}
            {isAuthenticated && (
                 <Tooltip title="Click to cycle status (Dev only)">
                    <Box
                        onClick={cycleEncryptionStatus} // Added for demo
                        className={styles.encryptionStatus}
                        sx={{
                            cursor: 'pointer', // Indicate it\'s clickable for demo
                            background: currentStatusInfo.bgColor,
                        }}
                        >
                        <Box
                            sx={{
                            width: 20, // Adjusted to fit icon better
                            height: 20, // Adjusted
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // position: "relative", // Not needed if using img directly
                            // overflow: "hidden", // Not needed if using img directly
                            }}
                        >
                            {/* The Figma icon was described as a 16x20 div at 4,2. 
                                Using an img tag for the svg is simpler. 
                                Ensure lock.svg is black as modified. */}
                            <img 
                                src={currentStatusInfo.icon} 
                                alt="status icon" 
                                style={{ 
                                    width: '16px', // Approximate size from Figma description
                                    height: '16px', //  Approximate size 
                                }}
                            />
                        </Box>
                        <Typography
                            className={styles.encryptionStatusText}
                            sx={{
                            color: currentStatusInfo.textColor,
                            }}
                        >
                            {currentStatusInfo.text}
                        </Typography>
                    </Box>
                </Tooltip>
            )}
          </Box>
        )}
      </Box>

      <Box className={styles.headerRight}>
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
                  primaryTypographyProps={{
                    style: {
                      /* overflow: 'hidden', textOverflow: 'ellipsis' */
                    },
                  }}
                />
              </Box>
              {/*<Box className={styles.profileMenuCompanySection}>
                <ListItemText
                  primary="Company name is very lonoooooooooooooooooooooooooooog case"
                  className={styles.profileMenuText}
                  primaryTypographyProps={{
                    style: {
                    },
                  }}
                />
              </Box>
              */}
              <Divider className={styles.profileMenuDivider} />
              <MenuItem
                onClick={() => {
                  /* Placeholder for Help & FAQ */ handleProfileClose();
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
              className={styles.loginButtonNew}
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
