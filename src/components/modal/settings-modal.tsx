"use client";

import { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem as SelectMenuItem, // Renamed to avoid conflict with Menu's MenuItem
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // For back navigation
import styles from "./settings-modal.module.scss";
import { SettingsPage } from './settings-modal-handler'; // Import the type
import CustomizePromptsView from '../customize-prompts-view'; // Import the new view
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // For navigation
import { useApiClient } from "@/providers/api-client-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useChatStore } from "@/store";

interface SettingsModalProps {
  open: boolean;
  currentPage: SettingsPage | null; // Added prop
  onClose: () => void;
}

// ActiveSettingSection is for the left nav, not the overall page
type ActiveSettingSection = "general" | "faq";

export default function SettingsModal({ open, currentPage, onClose }: SettingsModalProps) {
  const [activeNavSection, setActiveNavSection] =
    useState<ActiveSettingSection>("general");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, logout } = usePrivy();

  if (!authenticated) {
    return <div>Not authenticated</div>;
  }

  const { clearSessions } = useChatStore();
  const apiClient = useApiClient();

  const navigateTo = (hash: string) => {
    const currentSearchParams = searchParams.toString();
    const newUrl = `${pathname}${currentSearchParams ? '?' + currentSearchParams : ''}${hash}`;
    router.push(newUrl, { scroll: false });
  };

  const handleCloseModal = () => {
    onClose(); // This will clear the hash via SettingsModalHandler
  };

  const handleLogOut = () => {
    router.replace('/');
    logout();
    console.log("Log out on this device clicked");
  };

  const handleDeleteAllChats = () => {    
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAllChats = () => {
    apiClient.app.deleteConversations();
    clearSessions();
    router.replace('/');
    console.log("All chats deleted after confirmation");
    setDeleteConfirmOpen(false);
  };

  // Mock data and handlers for general settings
  const [theme, setTheme] = useState("light");
  const handleThemeChange = (event: any) => {
    setTheme(event.target.value);
  };

  const generalSettingsItems = [
    {
      label: "Theme",
      control: (
        <Select
          value={theme}
          onChange={handleThemeChange}
          variant="outlined"
          size="small"
          className={styles.selectControl}
          IconComponent={ExpandMoreIcon}
          MenuProps={{ classes: { paper: styles.selectMenuPaper } }}
        >
          <SelectMenuItem value="light">Light mode</SelectMenuItem>
          <SelectMenuItem value="dark">Dark mode</SelectMenuItem>
          <SelectMenuItem value="system">System</SelectMenuItem>
        </Select>
      ),
    },
    {
      label: "Custom instructions",
      control: (
        <Button
          variant="text"
          endIcon={<ChevronRightIcon />}
          className={styles.actionButtonText}
          onClick={() => navigateTo('#settings/prompts')} // Navigate to prompts page
        >
          On
        </Button>
      ),
    },
    // {
    //   label: "Archive chats",
    //   control: (
    //     <Button
    //       variant="outlined"
    //       className={styles.actionButton}
    //       onClick={() => console.log("Manage Archive chats clicked")}
    //     >
    //       Manage
    //     </Button>
    //   ),
    // },
    // {
    //   label: "Archive all chats",
    //   control: (
    //     <Button
    //       variant="outlined"
    //       className={styles.actionButton}
    //       onClick={() => console.log("Archive all chats clicked")}
    //     >
    //       Archive all
    //     </Button>
    //   ),
    // },
    {
      label: "Delete all chats",
      control: (
        <Button
          variant="contained"
          className={styles.deleteButton}
          onClick={handleDeleteAllChats}
        >
          Delete
        </Button>
      ),
    },
    {
      label: "Log out on this device",
      control: (
        <Button
          variant="outlined"
          className={styles.actionButton}
          onClick={handleLogOut}
        >
          Log out
        </Button>
      ),
    },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'prompts':
        return <CustomizePromptsView onNavigateBack={() => navigateTo('#settings')} />;
      case 'general':
      default: // Default to general settings if currentPage is null or unexpected
        return (
          <Box className={styles.generalSettings}>
            {generalSettingsItems.map((item, index) => (
              <Box key={index} className={styles.settingItem}>
                <Typography className={styles.settingItemLabel}>
                  {item.label}
                </Typography>
                <Box className={styles.settingItemControl}>
                  {item.control}
                </Box>
              </Box>
            ))}
          </Box>
        );
    }
  };

  return (
    <>
      <Modal
        open={open} // Controlled by SettingsModalHandler
        onClose={handleCloseModal} // This calls props.onClose which clears hash
        aria-labelledby="settings-modal-title"
        aria-describedby="settings-modal-description"
        className={styles.modalBackdrop}
      >
        <Box className={styles.modalContent}>
          <Box className={styles.header}>
            {currentPage === 'prompts' && (
              <IconButton
                aria-label="back to general settings"
                onClick={() => navigateTo('#settings')}
                className={styles.backButton}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography
              id="settings-modal-title"
              variant="h6"
              component="h2"
              className={styles.title}
              sx={{ marginLeft: currentPage === 'prompts' ? 1 : 0}} // Adjust title position if back button is present
            >
              {currentPage === 'prompts' ? 'General' : 'Settings'} {/* Title changes based on view, or could be static */}
            </Typography>
            <IconButton
              aria-label="close settings"
              onClick={handleCloseModal}
              className={styles.closeButton}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider className={styles.divider} />

          {/* Main area for general settings with left nav and right panel */}
          {currentPage === 'general' && (
            <Box className={styles.mainArea}>
              <Box className={styles.leftNav}>
                <List component="nav">
                  <ListItemButton
                    selected={activeNavSection === "general"}
                    onClick={() => setActiveNavSection("general")}
                    className={clsx(styles.navItem, activeNavSection === "general" && styles.navItemActive)}
                  >
                    <ListItemIcon className={styles.navItemIcon}>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="General" />
                  </ListItemButton>
                  <ListItemButton
                    selected={activeNavSection === "faq"}
                    onClick={() => setActiveNavSection("faq")}
                    // disabled // FAQ section not implemented yet
                    className={clsx(styles.navItem, activeNavSection === "faq" && styles.navItemActive)}
                  >
                    <ListItemIcon className={styles.navItemIcon}>
                      <HelpOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Help & FAQ" />
                  </ListItemButton>
                </List>
              </Box>
              <Box className={styles.rightPanel}>
                {/* Render general settings items directly for now, FAQ would be another case here based on activeNavSection */}
                {activeNavSection === 'general' && renderContent()} 
                {activeNavSection === 'faq' && (
                   <Box>
                      <Typography variant="h6">Help & FAQ</Typography>
                      <Typography>This is where help and FAQ content will go.</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Main area for prompts view (takes full width after header) */}
          {currentPage === 'prompts' && (
              <Box className={styles.promptsViewFullArea}>
                  {renderContent()}
              </Box>
          )}
        </Box>
      </Modal>
      {/* Confirmation Dialog for Deleting Chats */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Delete"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete all your chats? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteAllChats} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Helper clsx function (can be moved to a utils file if used elsewhere)
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
} 