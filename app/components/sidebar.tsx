"use client"; // Make it a client component

import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useChatStore } from '@/app/store/chat'; // Import chat store
import { ChatList } from './ChatList/ChatList'; // Import ChatList
import SidebarHeader from './SidebarHeader'; // Import the new header
import { useAuthStatus } from '@/app/hooks/useAuthStatus'; // Import the auth hook
import styles from './sidebar.module.scss'; // Import the SCSS module
import clsx from 'clsx'; // For conditional class names

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onCollapseSidebar: () => void;
}

export default function Sidebar({ isSidebarCollapsed, onCollapseSidebar }: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();

  // Don't render the sidebar if not authenticated or Privy is not ready
  if (!isReady || !isAuthenticated) {
    return null;
  }

  // When authenticated, render the sidebar
  return (
    <Box
      className={clsx(styles.sidebar, isSidebarCollapsed && styles.sidebarCollapsed)}
      style={{
        width: isSidebarCollapsed ? 0 : '286px', // Control width for collapse animation
        // visibility: isSidebarCollapsed ? 'hidden' : 'visible',
        // opacity: isSidebarCollapsed ? 0 : 1,
        // transition: 'width 0.3s, opacity 0.3s, visibility 0.3s',
        // padding: isSidebarCollapsed ? 0 : undefined, // Remove padding when collapsed
      }}
    >
      {/* Sidebar Header */}
      <SidebarHeader onCollapseSidebar={onCollapseSidebar} />

      {/* New Chat Button - Removed */}
      {/* <List sx={{ flexShrink: 0 }}> */}
      {/*   <ListItem disablePadding> */}
      {/*     <ListItemButton onClick={handleNewChat}> */}
      {/*       <AddIcon sx={{ mr: 1 }} /> */}
      {/*       <ListItemText primary="New Chat" /> */}
      {/*     </ListItemButton> */}
      {/*   </ListItem> */}
      {/* </List> */}
      
      {/* Chat History List */}
      {/* {!isSidebarCollapsed && ( */}
        <Box className={styles.sidebarContent} sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}> 
          <ChatList /> 
        </Box>
      {/* )} */}

      {/* Potentially a SidebarFooter component here, using styles.sidebarFooter */} 
      {/* {!isSidebarCollapsed && <Box className={styles.sidebarFooter}>Footer Content</Box>} */}

    </Box>
  );
} 