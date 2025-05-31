"use client";

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chat';
import styles from './sidebar.module.scss';
import { Montserrat } from 'next/font/google';
import clsx from 'clsx';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '500'],
});

interface SidebarHeaderProps {
  isSidebarCollapsed: boolean;
}

export default function SidebarHeader({ isSidebarCollapsed }: SidebarHeaderProps) {
  const handleSettings = () => {
    window.location.hash = 'settings';
  };

  return (
    <Box className={clsx(styles.sidebarHeaderContainer, isSidebarCollapsed && styles.collapsed)}>
      <Box className={styles.sidebarHeaderIconRow}>
        {(!isSidebarCollapsed && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Removed placeholder comment for other left-aligned icons */}
            </Box>

            <Tooltip title="Settings">
              <IconButton onClick={handleSettings} sx={{ color: '#757575' }}>
                <img src="/icons/settings.svg" alt="Settings" className={styles.settingsIcon} />
              </IconButton>
            </Tooltip>
          </>
        ))}
      </Box>

      <Box
        className={clsx(styles.sidebarHeaderLogoRow, isSidebarCollapsed && styles.collapsed)}
      >
        <img src="/icons/logo.png" alt="Panda AI Logo" className={styles.sidebarHeaderLogoImage} />
        <Box
          className={clsx(styles.sidebarHeaderLogoTextContainer, isSidebarCollapsed && styles.collapsed)}
        >
          <Typography component="span" className={clsx(styles.logoTextBold, montserrat.className)}>
            PANDA
          </Typography>
        </Box>
      </Box>
    </Box>
  );
} 