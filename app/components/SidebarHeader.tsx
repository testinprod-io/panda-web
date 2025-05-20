"use client";

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useRouter } from 'next/navigation';
import { useChatStore } from '../store/chat';
import styles from './sidebar.module.scss';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '500'],
});

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
    <Box className={styles.sidebarHeaderContainer}>
      <Box className={styles.sidebarHeaderIconRow}>
        <Tooltip title="Collapse Sidebar">
          <IconButton onClick={onCollapseSidebar} sx={{ color: 'white' }}>
            <img src="/icons/sidebar.svg" alt="Collapse Sidebar" style={{ width: '24px', height: '24px', filter: 'invert(81%) sepia(0%) saturate(7189%) hue-rotate(101deg) brightness(89%) contrast(91%)' }} />
          </IconButton>
        </Tooltip>
        <Box>
          {/* <Tooltip title="Search (placeholder)">
            <IconButton sx={{ color: 'white' }}>
              <SearchIcon />
            </IconButton>
          </Tooltip> */}
          <Tooltip title="New Chat">
            <IconButton onClick={handleNewChat} sx={{ color: 'white' }}>
              <img src="/icons/new_chat.svg" alt="New Chat" style={{ width: '24px', height: '24px', filter: 'invert(81%) sepia(0%) saturate(7189%) hue-rotate(101deg) brightness(89%) contrast(91%)' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box className={styles.sidebarHeaderLogoRow}>
        <img src="/icons/logo.png" alt="Panda AI Logo" className={styles.sidebarHeaderLogoImage} />
        <Box className={styles.sidebarHeaderLogoTextContainer}>
          <Typography component="span" className={styles.logoTextBold} sx={{ fontFamily: montserrat.style.fontFamily, fontWeight: 600 }}>
            Panda&nbsp;
          </Typography>
          <Typography component="span" className={styles.logoTextNormal} sx={{ fontFamily: montserrat.style.fontFamily, fontWeight: 500 }}>
            AI
          </Typography>
        </Box>
      </Box>
    </Box>
  );
} 