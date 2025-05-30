"use client";

import React from "react";
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chat';
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

  const iconButtonClass = "p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <div className={clsx(
      "flex flex-col box-border",
      isSidebarCollapsed ? "px-3 py-4" : "px-[31px] py-4"
    )}>
      <div className={clsx(
        "flex items-center justify-end w-full min-h-[40px] mb-2"
      )}>
        {(!isSidebarCollapsed && (
          <div className="ml-auto">
            <button title="Settings" onClick={handleSettings} className={iconButtonClass}>
              <img src="/icons/settings.svg" alt="Settings" className="w-6 h-6 filter invert-[0.5] sepia-[0] saturate-[0] hue-rotate-[0deg] brightness-[0.9] contrast-[0.8]" />
            </button>
          </div>
        ))}
        {isSidebarCollapsed && (
          <div className="flex flex-col items-center justify-center w-full">
            <button title="Settings" onClick={handleSettings} className={clsx(iconButtonClass, "mb-1")}>
              <img src="/icons/settings.svg" alt="Settings" className="w-6 h-6 filter invert-[0.5] sepia-[0] saturate-[0] hue-rotate-[0deg] brightness-[0.9] contrast-[0.8]" />
            </button>
          </div>
        )}
      </div>

      <div
        className={clsx(
          "flex items-center box-border transition-all duration-300 ease-in-out h-12 w-full rounded-lg",
          isSidebarCollapsed ? "flex-col justify-center gap-1 w-auto px-0" : "flex-row items-center gap-2 px-3"
        )}
      >
        <img src="/icons/logo.png" alt="Panda AI Logo" 
          className={clsx(
            "rounded",
            isSidebarCollapsed ? "w-8 h-8" : "w-8 h-8"
          )}
        />
        {!isSidebarCollapsed && (
          <div
            className={clsx(
              "flex text-gray-800 tracking-[0.8px] leading-tight"
            )}
          >
            <span 
              className={clsx(
                "text-xl"
              )}
              style={{ fontFamily: montserrat.style.fontFamily, fontWeight: 600 }}
            >
              PANDA
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 