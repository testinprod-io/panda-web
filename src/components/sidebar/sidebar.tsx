"use client"; // Make it a client component

import React from "react"; // Removed unused MUI imports and SxProps/Theme
import { ChatList } from "@/components/chat-list/chat-list";
import SidebarHeader from "@/components/sidebar/sidebar-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import styles from "./sidebar.module.scss"; // Will be removed incrementally
import clsx from "clsx";
import AccessPanel from "@/components/sidebar/access-panel";
import ProjectPanel from "@/components/sidebar/project-panel";
import { useRouter } from "next/navigation";
import { useEncryption } from "@/providers/encryption-provider";
import { usePrivy } from "@privy-io/react-auth";

// Icon Placeholders (if any were directly used by Sidebar for Tooltip, not the case here)

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  className?: string; // Added className to accept classes from ChatLayoutContent for positioning
  // sx prop is removed as styling will be handled by Tailwind classes via className or internal logic
}

export default function Sidebar({
  isSidebarCollapsed,
  onToggleSidebar,
  className, // Consumed from ChatLayoutContent
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();
  const router = useRouter();
  const { lockApp } = useEncryption();
  const { logout } = usePrivy();

  if (!isReady || !isAuthenticated) {
    return null;
  }

  // isOverlayMode was determined by sx prop, now can be inferred if mobile via isSidebarCollapsed and className logic from parent
  // Or, ChatLayoutContent could pass an explicit isMobile prop if needed here.
  // For now, assuming `className` from parent handles fixed/relative positioning correctly.

  const collapsedPaneWidthPx = 125; 
  const expandedPaneWidthPx = 378;
  const collapsedPaneWidthTw = `w-[${collapsedPaneWidthPx}px]`; // e.g. w-[125px]
  const expandedPaneWidthTw = `w-[${expandedPaneWidthPx}px]`;   // e.g. w-[378px]
  
  const sidebarTransition = "transition-all duration-300 ease-in-out"; // Approximates $sidebar-transition-duration and timing

  const handleNewChat = () => { router.push(`/`); };
  const handleSettings = () => { window.location.hash = 'settings'; };
  const handleLogout = () => { logout(); lockApp(); };
  const handleLockServiceClick = () => { lockApp(); };

  const navItems = [
    { id: "newChat", iconSrc: "/icons/new-chat.svg", alt: "New Chat", text: "New chat", action: handleNewChat },
    { id: "settings", iconSrc: "/icons/settings.svg", alt: "Settings", text: "Settings", action: handleSettings },
    { id: "logout", iconSrc: "/icons/logout.svg", alt: "Log out", text: "Log out", action: handleLogout },
  ];

  return (
    <aside
      className={clsx(
        "h-full flex flex-col flex-shrink-0 box-border overflow-x-hidden overflow-y-hidden bg-white border-r border-gray-300",
        className 
      )}
    >
      <SidebarHeader isSidebarCollapsed={isSidebarCollapsed} />

      <div // Sliding Container
        className={clsx(
          `flex flex-grow min-h-0 transform w-[${expandedPaneWidthPx + collapsedPaneWidthPx}px]`, // width: calc(expanded + collapsed)
          sidebarTransition,
          isSidebarCollapsed ? `-translate-x-[${expandedPaneWidthPx}px]` : "translate-x-0"
        )}
      >
        {/* Expanded Pane */}
        <div className={clsx(
          "flex flex-col box-border overflow-x-hidden overflow-y-auto h-full shrink-0", // paneBase + specific overflow + shrink
          expandedPaneWidthTw
          )}
        >
          <div className="flex-grow flex flex-col gap-5 w-full min-h-0 px-4 md:px-6 lg:px-8 py-4 md:py-5"> {/* Adjusted padding to be more Tailwind-idiomatic */}
            <ProjectPanel onNewChat={handleNewChat} />
            <AccessPanel onLockServiceClick={handleLockServiceClick} />
            <div className="flex-grow flex flex-col w-full min-h-0"> {/* sidebarContent (for ChatList) */}
              <ChatList />
            </div>
          </div>
        </div>

        {/* Collapsed Pane */}
        <div className={clsx(
          "flex flex-col box-border items-center pt-5 pb-5 shrink-0 overflow-y-hidden h-full", // paneBase + specific styles + shrink
          collapsedPaneWidthTw
          )}
        >
          <div className={clsx(
            "flex flex-col items-center gap-5 w-[77px] box-border" // nav-menu-collapsed-width = 77px
          )}>
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={item.action}
                title={item.text}
                className={clsx(
                  "flex flex-col items-center gap-1 cursor-pointer py-2 w-full box-border group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-md" // Added focus rings and rounded for nav items
                )}
                aria-label={item.text}
              >
                <div className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors duration-150">
                  <img src={item.iconSrc} alt={item.alt} className="w-full h-full object-contain" />
                </div>
                <span className="font-inter text-xs font-normal text-gray-600 group-hover:text-gray-800 text-center leading-tight transition-colors duration-150">
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
