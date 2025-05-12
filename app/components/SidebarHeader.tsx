"use client";

import { Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../store/chat';
import styles from './sidebar.module.scss';

interface SidebarHeaderProps {
  onCollapseSidebar: () => void;
}

export default function SidebarHeader({ onCollapseSidebar }: SidebarHeaderProps) {
  const router = useRouter();
  const store = useChatStore();

  const handleNewChat = () => {
    store.setCurrentSessionIndex(-1);
    router.push(`/chat`);
  };

  return (
    <Box
      className={styles.sidebarHeader}
    >
      <Tooltip title="Collapse Sidebar">
        <IconButton onClick={onCollapseSidebar} sx={{ color: 'white' }}>
          <ChevronLeftIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="New Chat">
        <IconButton onClick={handleNewChat} sx={{ color: 'white' }}>
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
} 