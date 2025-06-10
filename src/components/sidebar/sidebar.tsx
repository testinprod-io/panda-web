"use client";

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useState } from "react";
import { ChatList } from "@/components/chat-list/chat-list";
import SidebarHeader from "@/components/sidebar/sidebar-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import styles from "./sidebar.module.scss";
import clsx from "clsx";
import { SxProps, Theme } from "@mui/material/styles";
import AccessPanel from "@/components/sidebar/access-panel";
import ProjectPanel from "@/components/sidebar/project-panel";
import { useRouter } from "next/navigation";
import { useEncryption } from "@/providers/encryption-provider";
import { usePrivy } from "@privy-io/react-auth";
import { Tooltip } from "@mui/material";
import { useChatStore } from "@/store/chat";
import { useAppConfig } from "@/store/config";
import { AuthService } from "@/services/auth-service";

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  sx?: SxProps<Theme>;
}

export default function Sidebar({
  isSidebarCollapsed,
  onToggleSidebar,
  sx,
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();
  const router = useRouter();
  const { lockApp } = useEncryption();
  const { logout } = usePrivy();
  const { authenticated } = usePrivy();
  const [showConfirm, setShowConfirm] = useState(false);
  const { sessions, currentSessionIndex, removeSession } = useChatStore();
  const { models, setApiProvider } = useAppConfig();

  if (!isReady || !isAuthenticated) {
    return null;
  }

  const isOverlayMode = Boolean(sx);
  const collapsedPaneWidth = "80px";
  const expandedPaneWidth = "256px";

  const handleNewChat = () => {
    router.push(`/`);
  };

  const handleSettings = () => {
    window.location.hash = "settings";
  };

  const handleLogout = () => {
    AuthService.handleLogout(logout, lockApp);
  };

  const handleLockServiceClick = () => {
    lockApp();
  };

  const navItems = [
    // { id: "search", icon: <SearchIcon />, text: "Search", action: handleSearch },
    {
      id: "menu",
      icon: (
        <img
          src="/icons/menu.svg"
          alt="Menu"
          className={styles.navMenuIcon}
        />
      ),
      text: "Menu",
      action: onToggleSidebar,
    },
    {
      id: "newChat",
      icon: (
        <img
          src="/icons/new-chat.svg"
          alt="New Chat"
          className={styles.navMenuIcon}
        />
      ),
      text: "New chat",
      action: handleNewChat,
    },
    // { id: "archive", icon: <ArchiveIcon />, text: "Archive", action: handleArchive },
    {
      id: "settings",
      icon: (
        <img
          src="/icons/settings.svg"
          alt="Settings"
          className={styles.navMenuIcon}
        />
      ),
      text: "Settings",
      action: handleSettings,
    },
    {
      id: "logout",
      icon: (
        <img
          src="/icons/logout.svg"
          alt="Log out"
          className={styles.navMenuIcon}
        />
      ),
      text: "Log out",
      action: handleLogout,
    },
  ];

  return (
    <Box
      className={clsx(styles.sidebar, isOverlayMode && styles.sidebarOverlay)}
      style={
        !isOverlayMode
          ? {
              width: isSidebarCollapsed
                ? collapsedPaneWidth
                : expandedPaneWidth,
            }
          : {}
      }
      sx={
        isOverlayMode
          ? sx
          : {
              width: isSidebarCollapsed
                ? collapsedPaneWidth
                : expandedPaneWidth,
              display: "flex",
              flexDirection: "column",
            }
      }
    >
      <Box
        className={styles.slidingContainer}
        style={{
          transform: isSidebarCollapsed
            ? `translateX(-${expandedPaneWidth})`
            : "translateX(0px)",
        }}
      >
        <Box
          className={styles.expandedPane}
          style={{ width: expandedPaneWidth }}
        >
          <SidebarHeader isSidebarCollapsed={false} handleNewChat={handleNewChat} />
          <Box
            className={styles.expandedContentArea}
            sx={{ flexGrow: 1, minHeight: 0 }}
          >
            <ProjectPanel onNewChat={handleNewChat} />
            <AccessPanel onLockServiceClick={handleLockServiceClick} />
            <Box className={styles.sidebarContent}>
              <ChatList />
            </Box>
          </Box>
        </Box>

        <Box
          className={styles.collapsedPane}
          style={{ width: collapsedPaneWidth }}
        >
          <SidebarHeader isSidebarCollapsed={true} handleNewChat={handleNewChat} />
          <Box className={styles.collapsedNavMenu}>
            {navItems.map((item) => (
              <Tooltip
                title={
                  <div className={styles.tooltip}>
                    {/* <div className={styles.tooltipIcon}>{item.icon}</div> */}
                    <div className={styles.tooltipText}>{item.text}</div>
                  </div>
                }
                placement="right"
                key={item.id}
                componentsProps={{
                  tooltip: {
                    color: "#FFFFFF",
                    sx: {
                      border: "none",
                      backgroundColor: "transparent",
                      padding: 0,
                      marginLeft: "10px !important",
                    },
                  },
                }}
              >
                <Box
                  className={styles.collapsedNavItem}
                  onClick={item.action}
                  key={item.id}
                >
                  <Box className={styles.navItemIcon}>{item.icon}</Box>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
