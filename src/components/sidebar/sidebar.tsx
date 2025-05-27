"use client"; // Make it a client component

import { Box } from "@mui/material";
import { ChatList } from "@/components/chat-list/chat-list";
import SidebarHeader from "@/components/sidebar/sidebar-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import styles from "./sidebar.module.scss";
import clsx from "clsx"; // For conditional class names
import { SxProps, Theme } from "@mui/material/styles"; // Import SxProps and Theme

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onCollapseSidebar: () => void;
  sx?: SxProps<Theme>; // Add sx prop
}

export default function Sidebar({
  isSidebarCollapsed,
  onCollapseSidebar,
  sx, // Destructure sx
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();

  // Don't render the sidebar if not authenticated or Privy is not ready
  if (!isReady || !isAuthenticated) {
    return null;
  }

  const isOverlayMode = Boolean(sx); // If sx is passed from layout.tsx, we are in overlay/mobile mode

  // When authenticated, render the sidebar
  return (
    <Box
      className={clsx(
        styles.sidebar,
        !isOverlayMode && isSidebarCollapsed && styles.sidebarCollapsed 
      )}
      // Apply inline style for width animation ONLY if NOT in overlay mode
      // In overlay mode, visibility is handled by the transform in ChatLayoutContent
      style={!isOverlayMode ? {
        // width: isSidebarCollapsed ? 0 : "378px",
        // In desktop mode, also manage visibility with width for a clean collapse
        visibility: isSidebarCollapsed ? "hidden" : "visible", 
      } : {
        // In overlay mode, do NOT set visibility here.
        // The transform: translateX(-100%) from ChatLayoutContent will handle hiding.
        // The width is also fixed by ChatLayoutContent's sx prop in overlay mode.
      }}
      // sx prop from layout.tsx applies for overlay mode styling (transform, fixed width, etc.)
      // or can be used for additional desktop styling if ever passed from there.
      sx={sx} 
    >
      {/* ADDED - Inner wrapper for padding and content layout */}
      <Box className={styles.sidebarInnerWrapper}>
        {/* Content visibility will be handled by the sidebar sliding off-screen in overlay mode */}
        {/* If further fine-tuning of content opacity during overlay slide is needed, we can revisit */}
        <SidebarHeader onCollapseSidebar={onCollapseSidebar} />

        <Box
          className={styles.sidebarContent}
          // REMOVED overflowY: "auto" from sx prop, flexGrow and minHeight are good.
          sx={{ flexGrow: 1, minHeight: 0 }} 
        >
          <ChatList />
        </Box>
      </Box>
    </Box>
  );
}
