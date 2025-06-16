"use client";

import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import styles from "./sidebar.module.scss";
import clsx from "clsx";
import Image from "next/image";
interface SidebarHeaderProps {
  isSidebarCollapsed: boolean;
  handleNewChat: () => void;
}

export default function SidebarHeader({
  isSidebarCollapsed,
  handleNewChat,
}: SidebarHeaderProps) {
  const handleSettings = () => {
    window.location.hash = "settings";
  };

  return (
    <Box
      className={clsx(
        styles.sidebarHeaderContainer,
        isSidebarCollapsed && styles.collapsed,
      )}
    >
      <Box
        className={clsx(
          styles.sidebarHeaderLogoRow,
          isSidebarCollapsed && styles.collapsed,
        )}
        onClick={handleNewChat}
      >
        <Image
          src="/icons/inverse-icon.svg"
          alt="Panda Logo"
          className={clsx(styles.sidebarHeaderLogoImage, isSidebarCollapsed && styles.collapsed)}
          width={32}
          height={32}
        />
        {!isSidebarCollapsed && (
        <Box
          className={clsx(
            styles.sidebarHeaderLogoTextContainer,
            isSidebarCollapsed && styles.collapsed,
          )}
        >
          <Box
            component="span"
            className={styles.logoTextBold}
          >
            PANDA
          </Box>
        </Box>
        )}
      </Box>
    </Box>
  );
}
