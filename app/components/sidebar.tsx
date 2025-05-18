"use client"; // Make it a client component

import { Box } from "@mui/material";
import { ChatList } from "./ChatList/ChatList";
import SidebarHeader from "./SidebarHeader";
import { useAuthStatus } from "@/app/hooks/useAuthStatus";
import styles from "./sidebar.module.scss";
import clsx from "clsx"; // For conditional class names

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onCollapseSidebar: () => void;
}

export default function Sidebar({
  isSidebarCollapsed,
  onCollapseSidebar,
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();

  // Don't render the sidebar if not authenticated or Privy is not ready
  if (!isReady || !isAuthenticated) {
    return null;
  }

  // When authenticated, render the sidebar
  return (
    <Box
      className={clsx(
        styles.sidebar,
        isSidebarCollapsed && styles.sidebarCollapsed
      )}
      style={{
        width: isSidebarCollapsed ? 0 : "286px",
      }}
    >
      <SidebarHeader onCollapseSidebar={onCollapseSidebar} />

      <Box
        className={styles.sidebarContent}
        sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}
      >
        <ChatList />
      </Box>
    </Box>
  );
}
