"use client";

import { Box, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../store/chat';

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
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        // borderBottom: '1px solid',
        borderColor: 'divider',
        height: '49px', // Match chat header height + border
        flexShrink: 0,
      }}
    >
      <Tooltip title="Collapse Sidebar">
        <IconButton onClick={onCollapseSidebar}>
          <ChevronLeftIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="New Chat">
        <IconButton onClick={handleNewChat}>
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
} 