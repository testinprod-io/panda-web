"use client";

import { useState, useEffect, useCallback } from "react";
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
import { usePrivy } from "@privy-io/react-auth";
import styles from "./chat-header.module.scss";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { VerificationResult, VerificationStatus } from "@/types/attestation";
import { useAttestation } from "@/sdk/hooks";
import { usePandaSDK } from "@/providers/sdk-provider";
import { UUID } from "crypto";
import { ServerModelInfo } from "@/sdk/client/types";
import { useConfig } from "@/sdk/hooks";
import Locale from "@/locales";
import HelpIcon from "@/public/icons/help.svg";
import SettingsIcon from "@/public/icons/settings.svg";
import LogoutIcon from "@/public/icons/logout.svg";
import { useAuth } from "@/sdk/hooks";
import SidebarIcon from "@/public/icons/sidebar.svg";
import NewChatIcon from "@/public/icons/new-chat.svg";

interface ChatHeaderProps {
  currentChatId?: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export default function ChatHeader({
  currentChatId,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobile,
}: ChatHeaderProps) {
  const { login, user } = usePrivy();
  const pandaConfig = useConfig();
  const { verificationResults } = useAttestation();
  const { logout, lockApp, isAuthenticated } = useAuth();
  const { sdk } = usePandaSDK();
  const [currentChatModel, setCurrentChatModel] = useState<
    ServerModelInfo | undefined
  >();

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const profileMenuOpen = Boolean(profileAnchorEl);

  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelAnchorEl);

  useEffect(() => {
    if (currentChatId) {
      sdk.chat.getChat(currentChatId as UUID).then((chat) => {
        if (chat?.defaultModelName) {
          const model = pandaConfig.models.find(
            (m) => m.model_name === chat.defaultModelName
          );
          setCurrentChatModel(model);
        } else {
          setCurrentChatModel(pandaConfig.defaultModel);
        }
      });
    } else {
      setCurrentChatModel(pandaConfig.defaultModel);
    }
  }, [currentChatId, sdk.chat, pandaConfig.defaultModel, pandaConfig.models]);

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
    logout();
  };

  const handleModelSelect = (modelName: string) => {
    const selectedModelDetails = pandaConfig.models.find(
      (m) => m.model_name === modelName
    );

    if (selectedModelDetails) {
      if (currentChatId) {
        sdk.chat.getChat(currentChatId as UUID).then((chat) => {
          chat?.setDefaultModelForChat(selectedModelDetails.model_name);
          setCurrentChatModel(selectedModelDetails);
        });
      } else {
        sdk.config.setDefaultModel(modelName);
      }
    }
    handleModelClose();
  };

  const handleOpenLoginPopup = () => {
    router.push("/login");
  };

  const handleOpenSignupPopup = () => {
    router.push("/signup");
  };

  const router = useRouter();

  const handleNewChat = () => {
    sdk.chat.clearActiveChat();
    router.push(`/`);
  };

  const displayModelName =
    currentChatModel?.name ?? pandaConfig.defaultModel?.name ?? "Select Model";

  const currentModelNameForSelectionLogic =
    currentChatModel?.model_name ?? pandaConfig.defaultModel?.model_name;

  const modelsToDisplay = pandaConfig.models;

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
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleProfileClose();

    requestAnimationFrame(() => {
      window.location.hash = "settings";
    });
  };

  return (
    <Box className={styles.chatHeader}>
      <Box className={styles.headerLeft}>
        {isAuthenticated && isSidebarCollapsed && isMobile && (
          <>
            <Tooltip title="Reveal Sidebar">
              <IconButton
                onClick={onToggleSidebar}
                className={styles.revealSidebarButton}
              >
                <SidebarIcon className={styles.headerActionIconImg} />
              </IconButton>
            </Tooltip>
            <Tooltip title="New Chat">
              <IconButton
                onClick={handleNewChat}
                className={styles.newChatButton}
              >
                <NewChatIcon className={styles.headerActionIconImg}/>
              </IconButton>
            </Tooltip>
          </>
        )}

        {isAuthenticated && (
          <Box className={styles.modelSelectorContainer}>
            <Button
              id="model-selector-button"
              aria-controls={modelMenuOpen ? "model-selector-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={modelMenuOpen ? "true" : undefined}
              onClick={handleModelClick}
              variant="text"
              endIcon={
                <img
                  src="/icons/chevron-down.svg"
                  alt="Expand Sidebar"
                  style={{
                    width: "12px",
                    height: "7px",
                    filter:
                      "invert(52%) sepia(0%) saturate(23%) hue-rotate(153deg) brightness(88%) contrast(85%)",
                  }}
                />
              }
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
                  model.model_name === currentModelNameForSelectionLogic;
                return (
                  <MenuItem
                    key={`${model.model_name}`}
                    onClick={() => {
                      handleModelSelect(model.model_name);
                    }}
                    className={clsx(
                      styles.modelMenuItem,
                      isSelected && styles.selected
                    )}
                  >
                    <ListItemText
                      primary={model.name}
                      secondary={model.description}
                      className={styles.modelMenuItemText}
                      classes={{ secondary: styles.modelMenuItemDescription }}
                    />
                    <Box className={styles.iconContainer}>
                      {isSelected && (
                        <img src="/icons/check.svg" alt="Selected" />
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
              {pandaConfig.models.length === 0 && (
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
          <Tooltip
            title={
              <CertificateInfoPopup
                publicKey={currentStatusInfo.publicKey}
                verificationResult={currentStatusInfo}
              />
            }
            componentsProps={{
              tooltip: {
                sx: {
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  maxWidth: "600px",
                },
              },
            }}
          >
            <Box
              className={clsx(
                styles.encryptionStatus,
                currentStatusInfo.statusClass
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
        {isAuthenticated ? (
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
                  window.open(
                    "https://testinprod.notion.site/Help-FAQs-2098fc57f546805382f0da77fcdf07d5",
                    "_blank"
                  );
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
              {Locale.SignIn.Submit}
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenSignupPopup}
              size="small"
              className={styles.signUpButton}
            >
              {Locale.Signup.Submit}
            </Button>
          </>
        )}
      </Box>
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
        - <strong>End-to-end encrypted</strong>: Your message is encrypted
        in-browser and decrypted only inside Panda's TEE — visible to no one,
        including us.
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ color: "black" }}>
        - <strong>Verifiable</strong>: TEE attestation prove the running code
        matches the build we published on-chain.
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ color: "black" }}>
        - <strong>Opt-in cloud backups</strong>: Backups are re-encrypted with
        your password before they ever reach the cloud.
      </Typography>
    </Box>
  );
};
