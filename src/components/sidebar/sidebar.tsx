"use client"; // Make it a client component

import { Box, IconButton, Tooltip } from "@mui/material"; // Added IconButton and Tooltip
import { ChatList } from "@/components/chat-list/chat-list";
import SidebarHeader from "@/components/sidebar/sidebar-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import styles from "./sidebar.module.scss";
import clsx from "clsx"; // For conditional class names
import { SxProps, Theme } from "@mui/material/styles"; // Import SxProps and Theme
import AccessPanel from "@/components/sidebar/access-panel";
import ProjectPanel from "@/components/sidebar/project-panel";
import { useRouter } from "next/navigation"; // For navigation actions
import { useEncryption } from "@/providers/encryption-provider";
import { usePrivy } from "@privy-io/react-auth";
// Icons for the new nav menu and toggle button
// import SearchIcon from '@mui/icons-material/Search'; // Already in SidebarHeader

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void; // Kept, though toggle button might move or be part of header now
  sx?: SxProps<Theme>; // Add sx prop
}

export default function Sidebar({
  isSidebarCollapsed,
  onToggleSidebar, // Kept, though toggle button might move or be part of header now
  sx, // Destructure sx
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();
  const router = useRouter();
  const { lockApp } = useEncryption();
  const { logout } = usePrivy();

  // Don't render the sidebar if not authenticated or Privy is not ready
  if (!isReady || !isAuthenticated) {
    return null;
  }

  const isOverlayMode = Boolean(sx); // If sx is passed from layout.tsx, we are in overlay/mobile mode
  const collapsedPaneWidth = "125px"; // Matches $sidebar-collapsed-width
  const expandedPaneWidth = "300px"; // Matches $sidebar-expanded-width

  const handleNewChat = () => {
    // Logic for new chat, potentially from useChatStore or similar
    console.log("New Chat clicked");
    router.push(`/`);
  };

  // const handleSearch = () => { // Now handled within SidebarHeader
  //   console.log("Search clicked");
  // };

  const handleSettings = () => { // Partially handled by SidebarHeader, direct nav here for main settings page
    console.log("Settings clicked from collapsed nav");
    window.location.hash = 'settings';
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    logout();
    lockApp();
  };

  const handleLockServiceClick = () => {
    console.log("Lock Service clicked");
    lockApp();
  };

  const navItems = [
    // { id: "search", icon: <SearchIcon />, text: "Search", action: handleSearch },
    { id: "newChat", icon: <img src="/icons/new-chat.svg" alt="New Chat" style={{ width: '24px', height: '24px', filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)'  }} />, text: "New chat", action: handleNewChat },
    // { id: "archive", icon: <ArchiveIcon />, text: "Archive", action: handleArchive },
    { id: "settings", icon: <img src="/icons/settings.svg" alt="Settings" style={{ width: '24px', height: '24px', filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)' }} />, text: "Settings", action: handleSettings },
    { id: "logout", icon: <img src="/icons/logout.svg" alt="Log out" style={{ width: '24px', height: '24px', filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)' }} />, text: "Log out", action: handleLogout },
  ];

  return (
    <Box
      className={clsx(
        styles.sidebar,
        isOverlayMode && styles.sidebarOverlay
      )}
      style={!isOverlayMode ? {
        width: isSidebarCollapsed ? collapsedPaneWidth : expandedPaneWidth,
        // overflowY: isSidebarCollapsed ? 'hidden' : 'auto', // Control overflow here
      } : {}}
      sx={isOverlayMode ? sx : { 
        width: isSidebarCollapsed ? collapsedPaneWidth : expandedPaneWidth,
        display: 'flex', // Added for header + sliding container layout
        flexDirection: 'column' // Added for header + sliding container layout
      }}
    >
      {/* SidebarHeader is now a single instance, outside the sliding panes */}
      <SidebarHeader isSidebarCollapsed={isSidebarCollapsed} />

      <Box // This is the slidingContainer
        className={styles.slidingContainer}
        style={{
          transform: isSidebarCollapsed
            ? `translateX(-${expandedPaneWidth})`
            : "translateX(0px)",
        }}
      >
        {/* Expanded Pane (Content Only) */}
        <Box className={styles.expandedPane} style={{ width: expandedPaneWidth }}>
          {/* SidebarHeader removed from here */}
          <Box className={styles.expandedContentArea} sx={{ flexGrow: 1, minHeight: 0 }}>
            <ProjectPanel onNewChat={handleNewChat} />
            <AccessPanel onLockServiceClick={handleLockServiceClick} />
            <Box className={styles.sidebarContent}>
              <ChatList />
            </Box>
          </Box>
        </Box>

        {/* Collapsed Pane (Content Only) */}
        <Box className={styles.collapsedPane} style={{ width: collapsedPaneWidth }}>
          {/* SidebarHeader removed from here */}
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
