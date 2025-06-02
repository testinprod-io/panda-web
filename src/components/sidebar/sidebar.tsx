"use client";

import { Box, Tooltip } from "@mui/material";
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

  if (!isReady || !isAuthenticated) {
    return null;
  }

  const isOverlayMode = Boolean(sx);
  const collapsedPaneWidth = "125px";
  const expandedPaneWidth = "300px";

  const handleNewChat = () => {
    router.push(`/`);
  };

  const handleSettings = () => {
    window.location.hash = 'settings';
  };

  const handleLogout = () => {
    logout();
    lockApp();
  };

  const handleLockServiceClick = () => {
    lockApp();
  };

  const navItems = [
    // { id: "search", icon: <SearchIcon />, text: "Search", action: handleSearch },
    { id: "newChat", icon: <img src="/icons/new-chat.svg" alt="New Chat" className={styles.navMenuIcon} />, text: "New chat", action: handleNewChat },
    // { id: "archive", icon: <ArchiveIcon />, text: "Archive", action: handleArchive },
    { id: "settings", icon: <img src="/icons/settings.svg" alt="Settings" className={styles.navMenuIcon} />, text: "Settings", action: handleSettings },
    { id: "logout", icon: <img src="/icons/logout.svg" alt="Log out" className={styles.navMenuIcon} />, text: "Log out", action: handleLogout },
  ];

  return (
    <Box
      className={clsx(
        styles.sidebar,
        isOverlayMode && styles.sidebarOverlay
      )}
      style={!isOverlayMode ? {
        width: isSidebarCollapsed ? collapsedPaneWidth : expandedPaneWidth,
      } : {}}
      sx={isOverlayMode ? sx : { 
        width: isSidebarCollapsed ? collapsedPaneWidth : expandedPaneWidth,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <SidebarHeader isSidebarCollapsed={isSidebarCollapsed} />

      <Box
        className={styles.slidingContainer}
        style={{
          transform: isSidebarCollapsed
            ? `translateX(-${expandedPaneWidth})`
            : "translateX(0px)",
        }}
      >
        <Box className={styles.expandedPane} style={{ width: expandedPaneWidth }}>
          <Box className={styles.expandedContentArea} sx={{ flexGrow: 1, minHeight: 0 }}>
            <ProjectPanel onNewChat={handleNewChat} />
            <AccessPanel onLockServiceClick={handleLockServiceClick} />
            <Box className={styles.sidebarContent}>
              <ChatList />
            </Box>
          </Box>
        </Box>

        <Box className={styles.collapsedPane} style={{ width: collapsedPaneWidth }}>
          <Box className={styles.collapsedNavMenu}>
            {navItems.map((item) => (
              <Tooltip title={item.text} placement="right" key={item.id}>
                <Box className={styles.collapsedNavItem} onClick={item.action}>
                  <Box className={styles.navItemText}>{item.text}</Box>
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
