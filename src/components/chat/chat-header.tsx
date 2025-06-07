"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAppConfig, useChatStore } from "@/store";
import { DEFAULT_MODELS, ModelType } from "@/types/constant";
import LoginSignupPopup from "../login/login-signup-popup";
import styles from "./chat-header.module.scss";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useAttestationManager, VerificationResult, VerificationStatus } from "@/hooks/use-attestation-manager";
import { AttestationResult } from "@/types/attestation";

interface ChatHeaderProps {
  currentChatId?: string; 
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

type EncryptionStatus = "SUCCESSFUL" | "FAILED" | "IN_PROGRESS";

export default function ChatHeader({
  currentChatId,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobile,
}: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider } = useAppConfig();
  const { verificationResults } = useAttestationManager();

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

  // const [encryptionStatus, setEncryptionStatus] =
  //   useState<EncryptionStatus>("SUCCESSFUL");

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

  // const cycleEncryptionStatus = () => {
  //   setEncryptionStatus((prevStatus) => {
  //     if (prevStatus === "SUCCESSFUL") return "IN_PROGRESS";
  //     if (prevStatus === "IN_PROGRESS") return "FAILED";
  //     return "SUCCESSFUL";
  //   });
  // };

  const getEncryptionStatusInfo = useCallback(() => {
    console.log("MININININ verificationResults:", verificationResults);
    const firstStatus = Object.values(verificationResults)[0];
    switch (firstStatus && firstStatus.status) {
      case VerificationStatus.AttestationVerified:
      case VerificationStatus.ContractVerified:
        return {
          ...firstStatus,
          text: "Conversation encrypted",
          statusClass: styles.encryptionStatusSuccessful,
          icon: "/icons/shield-fill.svg",
        };
      case VerificationStatus.Failed:
        return {
          ...firstStatus,
          text: "Encryption Failed",
          statusClass: styles.encryptionStatusFailed,
          icon: "/icons/lock.svg",
        };
      case VerificationStatus.Pending:
        return {
          ...firstStatus,
          text: "Verifying...",
          statusClass: styles.encryptionStatusInProgress,
          icon: "/icons/lock.svg",
        };
      default:
        return {
          ...firstStatus,
          text: "Waiting for First Input",
          statusClass: styles.encryptionStatusUnknown,
          icon: "/icons/lock-icon.svg",
        };
    }
  }, [verificationResults]);

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
              variant="text"
              endIcon={<img src="/icons/chevron-down.svg" alt="Expand Sidebar" style={{width: "12px", height: "7px", filter: "invert(52%) sepia(0%) saturate(23%) hue-rotate(153deg) brightness(88%) contrast(85%)"}}/>}
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
                      secondary={model.description}
                      className={styles.modelMenuItemText}
                      classes={{ secondary: styles.modelMenuItemDescription }}
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
        {isAuthenticated && currentChatId && (
              <Tooltip title={<CertificateInfoPopup publicKey={currentStatusInfo.publicKey} verificationResult={currentStatusInfo} />} componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "white",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                  }
                }
              }}>
                <Box  
                  // onClick={cycleEncryptionStatus}
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
                    "Anonymous"
                  }
                  className={styles.profileMenuText}
                />
              </Box>
              <Divider className={styles.profileMenuDivider} />
              <MenuItem
                onClick={() => {
                  handleProfileClose();
                  window.open("https://testinprod.notion.site/Help-FAQs-2098fc57f546805382f0da77fcdf07d5", "_blank");
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

const CertificateInfoPopup: React.FC<{
  publicKey: string;
  verificationResult: VerificationResult;
}> = ({ publicKey, verificationResult }) => {
  return (
    <Box sx={{ p: 1, maxWidth: 300 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ color: "black" }}>
        🔒 Verified secure execution <a href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank" rel="noopener noreferrer" style={{ color: "black" }}>Learn more</a>
      </Typography>
      <Typography
        variant="body2"
        key={"AppID"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>Currently connected certificate:</strong> <a href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`} target="_blank" rel="noopener noreferrer" style={{ color: "black" }}>{publicKey}</a>
      </Typography>
      {/* <Typography
        variant="body2"
        key={"AppHash"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>AppHash:</strong> <a href={`https://www.youtube.com/watch?v=xvFZjo5PgG0`} target="_blank" rel="noopener noreferrer" style={{ color: "black" }}>{attestationResult.composeHash}</a>
      </Typography>

      <Typography
        variant="body2"
        key={"Help"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <a href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank" rel="noopener noreferrer" style={{ color: "black" }}><strong>Help?</strong></a>
      </Typography> */}

      {/* {Object.entries(attestationResult).map(([key, value]) => (
        <Typography
          variant="body2"
          key={key}
          sx={{ wordBreak: "break-all", p: "2px" }}
        >
          <strong>{key}:</strong>{" "}
          {Array.isArray(value) ? value.join(", ") : value}
        </Typography>
      ))} */}
    </Box>
  );
};

