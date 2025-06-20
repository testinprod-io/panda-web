"use client";

import { useState, useMemo } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  SelectChangeEvent,
  MenuItem as SelectMenuItem,
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
import styles from "./settings-modal.module.scss";
import { SettingsPage } from "./settings-modal-handler";
import CustomizePromptsView from "./customize-prompts-view";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/providers/api-client-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useChatStore } from "@/store";
import { useAppConfig, useAppConfig as useAppConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import { AuthService } from "@/services/auth-service";
import { useEncryption } from "@/providers/encryption-provider";
import { useAttestationStore } from "@/store/attestation";
import { AllLangs, ALL_LANG_OPTIONS, changeLang, Lang } from "@/locales";
import { safeLocalStorage } from "@/utils/utils";
import Locale from "@/locales";
import clsx from "clsx";

interface SettingsModalProps {
  open: boolean;
  currentPage: SettingsPage | null;
  onClose: () => void;
}

type ActiveSettingSection = "general" | "faq";

export default function SettingsModal({
  open,
  currentPage,
  onClose,
}: SettingsModalProps) {
  const [activeNavSection, setActiveNavSection] =
    useState<ActiveSettingSection>("general");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);

  const LANG_KEY = "lang";
  const localStorage = safeLocalStorage();
  const currentLang = localStorage.getItem(LANG_KEY) ?? "auto";

  const handleLangChange = (event: SelectChangeEvent<string>) => {
    const newLang = event.target.value;
    if (newLang === "auto") {
      localStorage.removeItem(LANG_KEY);
      location.reload();
    } else {
      changeLang(newLang as Lang);
    }
  };

  const passwordExpirationMinutes =
    useUserStore((state) => state.get<number>("passwordExpirationMinutes")) ?? 0;

  const handlePasswordExpirationChange = (event: SelectChangeEvent<string>) => {
    const value = parseInt(event.target.value, 10);
    useUserStore.getState().set("passwordExpirationMinutes", value);
  };

  const router = useRouter();
  const { authenticated, logout } = usePrivy();
  const { clearSessions } = useChatStore();
  const apiClient = useApiClient();
  const theme = useUserStore((state) => state.get<string>("theme")) ?? "system";
  const { lockApp } = useEncryption();
  if (!authenticated) {
    return <div></div>;
  }

  const handleCloseModal = () => {
    onClose();
    setDeleteConfirmOpen(false);
  };

  const handleLogOut = async () => {
    AuthService.handleLogout(logout, lockApp);
    setDeleteConfirmOpen(false);
    router.replace("/");
  };

  const handleDeleteAllChats = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAllChats = () => {
    apiClient.app.deleteConversations();
    clearSessions();
    router.replace("/");
    console.log("All chats deleted after confirmation");
    setDeleteConfirmOpen(false);
  };

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    useUserStore.getState().set("theme", event.target.value as string);
  };

  const passwordExpirationOptions = [
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 0, label: "Never" },
  ];

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
          sx={{
            fieldset: {
              border: "none",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
          }}
        >
          <SelectMenuItem value="light">Light mode</SelectMenuItem>
          <SelectMenuItem value="dark">Dark mode</SelectMenuItem>
          <SelectMenuItem value="system">System</SelectMenuItem>
        </Select>
      ),
    },
    {
      label: Locale.SettingsModal.Language,
      control: (
        <Select
          value={currentLang}
          onChange={handleLangChange}
          variant="outlined"
          size="small"
          className={styles.selectControl}
          IconComponent={ExpandMoreIcon}
          MenuProps={{ classes: { paper: styles.selectMenuPaper } }}
          sx={{
            fieldset: {
              border: "none",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
          }}
        >
          <SelectMenuItem value="auto">System</SelectMenuItem>
          {AllLangs.map((lang) => (
            <SelectMenuItem key={lang} value={lang}>
              {ALL_LANG_OPTIONS[lang]}
            </SelectMenuItem>
          ))}
        </Select>
      ),
    },
    {
      label: Locale.SettingsModal.CustomInstructions,
      control: (
        <Button
          variant="text"
          endIcon={<ChevronRightIcon />}
          className={styles.actionButtonText}
        />
      ),
      onClick: () => setIsPromptsModalOpen(true),
    },
    {
      label: Locale.SettingsModal.InactivityLockTimer,
      control: (
        <Select
          value={passwordExpirationMinutes.toString()}
          onChange={handlePasswordExpirationChange}
          variant="outlined"
          size="small"
          className={styles.selectControl}
          IconComponent={ExpandMoreIcon}
          MenuProps={{ classes: { paper: styles.selectMenuPaper } }}
          sx={{
            fieldset: {
              border: "none",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              border: "none",
            },
          }}
        >
          {passwordExpirationOptions.map((option) => (
            <SelectMenuItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectMenuItem>
          ))}
        </Select>
      ),
    },
    {
      label: Locale.SettingsModal.DeleteAllChats,
      control: (
        <Button
          variant="contained"
          className={styles.deleteButton}
          onClick={handleDeleteAllChats}
          sx={{ boxShadow: "0px" }}
          disableElevation={true}
        >
          {Locale.SettingsModal.Delete}
        </Button>
      ),
    },
    {
      label: Locale.SettingsModal.LogoutTitle,
      control: (
        <Button
          variant="outlined"
          className={styles.actionButton}
          onClick={handleLogOut}
        >
          {Locale.SettingsModal.Logout}
        </Button>
      ),
    },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case "general":
      default:
        return (
          <Box className={styles.generalSettings}>
            {(generalSettingsItems as any[]).map((item, index) => (
              <Box
                key={index}
                className={styles.settingItem}
                onClick={item.onClick}
                sx={{ cursor: item.onClick ? "pointer" : "default" }}
              >
                <Typography className={styles.settingItemLabel}>
                  {item.label}
                </Typography>
                <Box className={styles.settingItemControl}>{item.control}</Box>
              </Box>
            ))}
          </Box>
        );
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleCloseModal}
        aria-labelledby="settings-modal-title"
        aria-describedby="settings-modal-description"
        className={styles.modalBackdrop}
      >
        <Box className={styles.modalContent}>
          <Box className={styles.header}>
            <Typography
              id="settings-modal-title"
              variant="h6"
              component="h2"
              className={styles.title}
            >
              {Locale.SettingsModal.Settings}
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


          <Box className={styles.mainArea}>
            <Box className={styles.leftNav}>
              <List component="nav">
                <ListItemButton
                  selected={activeNavSection === "general"}
                  onClick={() => setActiveNavSection("general")}
                  className={clsx(
                    styles.navItem,
                    activeNavSection === "general" && styles.navItemActive,
                  )}
                >
                  <ListItemIcon className={styles.navItemIcon}>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText className={styles.navItemText} primary={Locale.SettingsModal.General} />
                </ListItemButton>
                <ListItemButton
                  selected={activeNavSection === "faq"}
                  onClick={() => setActiveNavSection("faq")}
                  className={clsx(
                    styles.navItem,
                    activeNavSection === "faq" && styles.navItemActive,
                  )}
                >
                  <ListItemIcon className={styles.navItemIcon}>
                    <HelpOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText className={styles.navItemText} primary={Locale.SettingsModal.Help} />
                </ListItemButton>
              </List>
            </Box>
            <Box className={styles.rightPanel}>
              {activeNavSection === "general" && renderContent()}
              {activeNavSection === "faq" && (
                <Box>
                  <Typography fontSize={24} fontWeight={600} fontFamily={"Inter"}>{Locale.SettingsModal.Help}</Typography>
                  <br />
                  <Typography>
                    <a href="https://testinprod.notion.site/Private-Alpha-One-Pager-1ff8fc57f54680d0aa08ce7b8013948a" className={styles.FAQText}>- Private Alpha One Pager</a>
                  </Typography>
                  <Typography>
                    <a href="https://testinprod.notion.site/Panda-Technical-FAQ-2018fc57f5468023bac3c5380179a272" className={styles.FAQText}>- Panda Technical FAQ</a>
                  </Typography>
                  <Typography>
                    <a href="https://testinprod.notion.site/Panda-Tips-Guides-2148fc57f54680f982b3d32973d20314" className={styles.FAQText}>- Panda Tips & Guides</a>
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={isPromptsModalOpen}
        onClose={() => setIsPromptsModalOpen(false)}
        aria-labelledby="customize-prompts-modal-title"
        className={styles.modalBackdrop}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "clamp(300px, 80vw, 750px)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 0,
            borderRadius: "16px",
            outline: "none",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <CustomizePromptsView
            onCloseRequest={() => setIsPromptsModalOpen(false)}
          />
        </Box>
      </Modal>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className={styles.confirmDialog}
      >
        <DialogTitle
          id="alert-dialog-title"
          className={styles.confirmDialogTitleContainer}
        >
          <div className={styles.confirmDialogTitle}>{Locale.SettingsModal.ClearChatData}</div>
        </DialogTitle>
        <DialogContent className={styles.confirmDialogContent} sx={{ padding: "0px 24px 16px 20px" }}>
          <DialogContentText
            id="alert-dialog-description-primary"
            className={styles.confirmDialogContentTextPrimary}
          >
            {Locale.SettingsModal.ClearChatDataDescription}
          </DialogContentText>
          <DialogContentText
            id="alert-dialog-description-secondary"
            className={styles.confirmDialogContentTextSecondary}
          >
            {Locale.SettingsModal.ClearChatDataDescription2}
          </DialogContentText>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions} sx={{ padding: "0px 12px 16px 16px"}}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            className={styles.confirmDialogButton}
          >
            {Locale.SettingsModal.Cancel}
          </Button>
          <Button
            onClick={confirmDeleteAllChats}
            className={styles.confirmDialogButtonDelete}
            autoFocus
          >
            {Locale.SettingsModal.Delete}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
