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
import { getAccessToken, usePrivy } from "@privy-io/react-auth";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAppConfig, useChatStore } from "@/store";
import { DEFAULT_MODELS, ModelType, ApiPath } from "@/types/constant";
import styles from "./chat-header.module.scss";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useAttestationManager, VerificationResult, VerificationStatus } from "@/hooks/use-attestation-manager";
import { AttestationResult } from "@/types/attestation";
import { AuthService } from "@/services/auth-service";
import { useEncryption } from "@/providers/encryption-provider";
import { useApiClient } from "@/providers/api-client-provider";
import Locale from "@/locales";
import HelpIcon from "@/public/icons/help.svg";
import SettingsIcon from "@/public/icons/settings.svg";
import LogoutIcon from "@/public/icons/logout.svg";

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
  const { login, logout, user, getAccessToken } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const {
    models: availableModels,
    setApiProvider,
    setModels,
  } = useAppConfig();
  const { verificationResults } = useAttestationManager();
  const { lockApp } = useEncryption();
  const apiClient = useApiClient();
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
  const [modelsFetched, setModelsFetched] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
    if (isAuthenticated && !modelsFetched) {
      try {
        const info = await apiClient.app.getInfo();
        setModels(info.models);
        setModelsFetched(true);
        if (!currentChatId && info.models.length > 0) {
          setApiProvider(info.models[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    }
  };
  fetchModels();
  }, [isAuthenticated, modelsFetched, setModels]);

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
    AuthService.handleLogout(logout, lockApp);
  };

  const handleModelSelect = (modelName: ModelType) => {
    const selectedModelDetails = availableModels.find(
      (m) => m.name === modelName,
    );
    if (selectedModelDetails) {
      setApiProvider(modelName);
    }
    handleModelClose();
  };

  const handleOpenLoginPopup = () => {
    router.push("/login");
  };

  const handleOpenSignupPopup = () => {
    router.push("/signup");
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
    (availableModels.length > 0 && availableModels[0].config.displayName);

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
          text: "Verification Failed",
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
                  alt={Locale.ChatHeader.RevealSidebar}
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
                  alt={Locale.ChatHeader.NewChat}
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
                return (
                  <MenuItem
                    key={`${model.name}`}
                    onClick={() => {
                      handleModelSelect(model.name as ModelType);
                    }}
                    className={clsx(
                      styles.modelMenuItem,
                      isSelected && styles.selected,
                    )}
                  >
                    <ListItemText
                      primary={model.displayName || model.name}
                      secondary={model.description}
                      className={styles.modelMenuItemText}
                      classes={{ secondary: styles.modelMenuItemDescription }}
                    />
                    <Box className={styles.iconContainer}>
                      {isSelected &&  (
                        <img src="/icons/check.svg" alt="Selected" />
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
              {availableModels.length === 0 && (
                <MenuItem disabled>
                  <ListItemText primary="Loading models..." />
                </MenuItem>
              )}
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
                    maxWidth: "600px",
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
                    user?.google?.email ||
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
                  <HelpIcon className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText
                  primary={Locale.ProfileMenu.Help}
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
                  <SettingsIcon className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText
                  primary={Locale.ProfileMenu.Settings}
                  className={styles.profileMenuTextItem}
                />
              </MenuItem>
              <MenuItem
                onClick={handleLogout}
                className={styles.profileMenuItem}
              >
                <ListItemIcon className={styles.profileMenuItemIconWrapper}>
                  <LogoutIcon className={styles.profileMenuIcon} />
                </ListItemIcon>
                <ListItemText
                  primary={Locale.ProfileMenu.Logout}
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
              Log in
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenSignupPopup}
              size="small"
              className={styles.signUpButton}
            >
              Sign up
            </Button>
          </>
        )}
      </Box>
      {/* <LoginSignupPopup
        open={isLoginPopupOpen}
        onClose={handleCloseLoginPopup}
        onLogin={handlePopupLogin}
        onSignup={handlePopupSignup}
      /> */}
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
        <strong>Panda's privacy at a glance</strong>
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ color: "black" }}>
        - <strong>End-to-end encrypted</strong>: Your message is encrypted in-browser and decrypted only inside Panda's TEE — visible to no one, including us.
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ color: "black" }}>
        - <strong>Verifiable</strong>: TEE attestation prove the running code matches the build we published on-chain.
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ color: "black" }}>
        - <strong>Opt-in cloud backups</strong>: Backups are re-encrypted with your password before they ever reach the cloud.
      </Typography>
      {/* <Typography variant="subtitle2" gutterBottom sx={{ color: "black" }}>
        🔒 Verified secure execution <a href="https://testinprod.notion.site/Panda-Technical-FAQ-2018fc57f5468023bac3c5380179a272" target="_blank" rel="noopener noreferrer" style={{ color: "black" }}>Learn more</a>
      </Typography>
      <Typography
        variant="body2"
        key={"AppID"}
        sx={{ wordBreak: "break-all", p: "2px", color: "black" }}
      >
        <strong>Currently connected certificate:</strong> <a href={`https://etherscan.io/`} target="_blank" rel="noopener noreferrer" style={{ color: "black" }}>{publicKey}</a>
      </Typography> */}
    </Box>
  );
};

