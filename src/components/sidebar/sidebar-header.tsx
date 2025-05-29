"use client";

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import SearchMuiIcon from '@mui/icons-material/Search';
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
  const router = useRouter();
  const store = useChatStore();

  const handleSearch = () => {
    console.log("Search icon clicked");
    // Implement search functionality
  };

  const handleSettings = () => {
    console.log("Settings icon clicked");
    window.location.hash = 'settings';
  };

  return (
    <Box className={clsx(styles.sidebarHeaderContainer, isSidebarCollapsed && styles.collapsed)}>
      <Box className={styles.sidebarHeaderIconRow}>
        {(!isSidebarCollapsed && (
          <>
            {/* Wrapper for left-aligned icons */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* <Tooltip title="Search">
                <IconButton onClick={handleSearch} sx={{ color: '#757575' }}>
                  <SearchMuiIcon />
                </IconButton>
              </Tooltip> */}
              {/* Add other left-aligned icons here if needed */}
            </Box>

            {/* Right-aligned icon(s) */}
            <Tooltip title="Settings">
              <IconButton onClick={handleSettings} sx={{ color: '#757575' }}>
                <img src="/icons/settings.svg" alt="Settings" style={{ width: '24px', height: '24px', filter: 'invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(80%)' }} />
              </IconButton>
            </Tooltip>
          </>
        ))}
      </Box>

      <Box
        className={styles.sidebarHeaderLogoRow}
        sx={{
          transition: 'all 0.3s ease-in-out',
          flexDirection: isSidebarCollapsed ? 'column' : 'row',
          alignItems: 'center',
          // justifyContent: isSidebarCollapsed ? 'center' : undefined,
          gap: isSidebarCollapsed ? '6px' : undefined,
          width: isSidebarCollapsed ? 'fit-content' : undefined,
          paddingLeft: isSidebarCollapsed ? '18px' : '8px',
          marginRight: isSidebarCollapsed ? undefined : undefined,
        }}
      >
        <img src="/icons/logo.png" alt="Panda AI Logo" className={styles.sidebarHeaderLogoImage} />
        <Box
          className={styles.sidebarHeaderLogoTextContainer}
          sx={{
            transition: 'none',
            margin: isSidebarCollapsed ? '0' : undefined,
            textAlign: isSidebarCollapsed ? 'center' : undefined,
          }}
        >
          <Typography component="span" className={styles.logoTextBold} sx={{ fontFamily: montserrat.style.fontFamily, fontWeight: 600 }}>
            PANDA
          </Typography>
        </Box>
      </Box>
    </Box>
  );
} 