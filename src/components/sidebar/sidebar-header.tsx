"use client";

import React from "react";
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
    <div className={clsx(
      styles.sidebarHeaderContainer,
      "flex flex-col pt-4",
      isSidebarCollapsed && styles.collapsed
    )}>
      <div className={clsx(
        styles.sidebarHeaderIconRow,
        "flex items-center justify-end w-full px-2 mb-2 min-h-[40px]"
      )}>
        {(!isSidebarCollapsed && (
          <>
            {/* Wrapper for left-aligned icons */}
            <div className="flex items-center">
              {/* <Tooltip title="Search">
                <IconButton onClick={handleSearch} sx={{ color: '#757575' }}>
                  <SearchMuiIcon />
                </IconButton>
              </Tooltip> */}
              {/* Add other left-aligned icons here if needed */}
            </div>

            {/* Right-aligned icon(s) */}
            <div className="ml-auto">
              <button title="Settings" onClick={handleSettings} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400">
                <img src="/icons/settings.svg" alt="Settings" className="w-6 h-6 filter invert-[0.5] sepia-[0] saturate-[0] hue-rotate-[0deg] brightness-[0.9] contrast-[0.8]" />
              </button>
            </div>
          </>
        ))}
        {isSidebarCollapsed && (
          <div className="flex flex-col items-center justify-center w-full">
            <button title="Settings" onClick={handleSettings} className={clsx("p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 mb-2")}>
              <img src="/icons/settings.svg" alt="Settings" className="w-6 h-6 filter invert-[0.5] sepia-[0] saturate-[0] hue-rotate-[0deg] brightness-[0.9] contrast-[0.8]" />
            </button>
          </div>
        )}
      </div>

      <div
        className={clsx(
          styles.sidebarHeaderLogoRow,
          "flex items-center transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "flex-col justify-center gap-1.5 w-fit px-[18px]" : "flex-row items-center gap-2 px-2"
        )}
      >
        <img src="/icons/logo.png" alt="Panda AI Logo" 
          className={clsx(
            styles.sidebarHeaderLogoImage,
            isSidebarCollapsed ? "w-10 h-10" : "w-8 h-8"
          )}
        />
        <div
          className={clsx(
            styles.sidebarHeaderLogoTextContainer,
            "transition-none",
            isSidebarCollapsed ? "text-center" : ""
          )}
        >
          <span 
            className={clsx(
              styles.logoTextBold,
              "text-lg text-gray-800"
            )}
            style={{ fontFamily: montserrat.style.fontFamily, fontWeight: 600 }}
          >
            PANDA
          </span>
        </div>
      </div>
    </div>
  );
} 