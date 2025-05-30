"use client"; // Make it a client component

// import { Box, IconButton, Tooltip } from "@mui/material"; // Box removed
import { Tooltip } from "@mui/material"; // IconButton not directly used here
import { ChatList } from "@/components/chat-list/chat-list";
import SidebarHeader from "@/components/sidebar/sidebar-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
// import styles from "./sidebar.module.scss"; // Removed
// import clsx from "clsx"; // Removed
// import { SxProps, Theme } from "@mui/material/styles"; // Removed, sx prop will be for overlay only
import AccessPanel from "@/components/sidebar/access-panel";
import ProjectPanel from "@/components/sidebar/project-panel";
import { useRouter } from "next/navigation"; // For navigation actions
import { useEncryption } from "@/providers/encryption-provider";
import { usePrivy } from "@privy-io/react-auth";
// Icons for the new nav menu and toggle button
// import SearchIcon from '@mui/icons-material/Search'; // Already in SidebarHeader

interface SidebarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void; // Kept, though toggle button might move or be part of header now
  sx?: React.CSSProperties; // Changed SxProps to React.CSSProperties for overlay style
}

export default function Sidebar({
  isSidebarCollapsed,
  onToggleSidebar, // Kept, though toggle button might move or be part of header now
  sx, // Destructure sx
}: SidebarProps) {
  const { isReady, isAuthenticated } = useAuthStatus();
  const router = useRouter();
  const { lockApp } = useEncryption();
  const { logout } = usePrivy();

  // Don't render the sidebar if not authenticated or Privy is not ready
  if (!isReady || !isAuthenticated) {
    return null;
  }

  const isOverlayMode = Boolean(sx); // If sx is passed from layout.tsx, we are in overlay/mobile mode
  const collapsedPaneWidth = "125px"; // Matches $sidebar-collapsed-width
  const expandedPaneWidth = "378px"; // Matches $sidebar-expanded-width

  const handleNewChat = () => {
    // Logic for new chat, potentially from useChatStore or similar
    console.log("New Chat clicked");
    router.push(`/`);
  };

  // const handleSearch = () => { // Now handled within SidebarHeader
  //   console.log("Search clicked");
  // };

  const handleSettings = () => { // Partially handled by SidebarHeader, direct nav here for main settings page
    console.log("Settings clicked from collapsed nav");
    window.location.hash = 'settings';
  };

  const handleLogout = () => {
    console.log("Logout clicked");
    logout();
    lockApp();
  };

  const handleLockServiceClick = () => {
    console.log("Lock Service clicked");
    lockApp();
  };

  const navItems = [
    // { id: "search", icon: <SearchIcon />, text: "Search", action: handleSearch },
    { id: "newChat", icon: <img src="/icons/new-chat.svg" alt="New Chat" className="w-6 h-6" style={{ filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)' }} />, text: "New chat", action: handleNewChat },
    // { id: "archive", icon: <ArchiveIcon />, text: "Archive", action: handleArchive },
    { id: "settings", icon: <img src="/icons/settings.svg" alt="Settings" className="w-6 h-6" style={{ filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)' }} />, text: "Settings", action: handleSettings },
    { id: "logout", icon: <img src="/icons/logout.svg" alt="Log out" className="w-6 h-6" style={{ filter: 'invert(0%) sepia(3%) saturate(4%) hue-rotate(324deg) brightness(100%) contrast(100%)' }} />, text: "Log out", action: handleLogout },
  ];

  // Base sidebar classes
  // SCSS: .sidebar
  const sidebarBaseClasses = "bg-white h-full flex flex-col flex-shrink-0 box-border border-r border-[#cacaca] overflow-x-hidden relative transition-width duration-400 ease-in-out overflow-y-hidden";

  // SCSS: .slidingContainer
  const slidingContainerClasses = "flex flex-grow min-h-0 transition-transform duration-400 ease-in-out transform"; // transform style is dynamic
  // width: calc($sidebar-expanded-width + $sidebar-collapsed-width) -> w-[calc(378px+125px)] or w-[503px]
  // Using an arbitrary value for the calculated width.
  const slidingContainerDynamicWidth = `calc(${expandedPaneWidth} + ${collapsedPaneWidth})`;

  // SCSS: .paneBase (common to expanded and collapsed panes)
  const paneBaseClasses = "flex flex-col box-border overflow-x-hidden";

  // SCSS: .expandedPane
  const expandedPaneClasses = `${paneBaseClasses} overflow-y-auto h-full`; // width is dynamic

  // SCSS: .collapsedPane
  const collapsedPaneClasses = `${paneBaseClasses} items-center pt-5 pb-5 flex-shrink-0 overflow-y-hidden`; // width is dynamic, padding-top/bottom: 20px -> pt-5 pb-5

  // SCSS: .expandedContentArea
  const expandedContentAreaClasses = "flex-grow flex flex-col gap-5 w-full min-h-0 p-[17px_31px]"; // padding: 17px 31px -> p-[17px_31px]
  
  // SCSS: .sidebarContent (contains ChatList)
  const sidebarContentClasses = "flex-grow flex flex-col w-full";

  // SCSS: .collapsedNavMenu
  const collapsedNavMenuClasses = "flex flex-col items-center gap-5 box-border w-[77px]"; // width: $nav-menu-collapsed-width (77px)

  // SCSS: .collapsedNavItem
  const collapsedNavItemClasses = "flex flex-col items-center gap-1 cursor-pointer py-2 w-full box-border";
  // SCSS: .navItemText
  const navItemTextClasses = "font-inter text-sm font-normal text-[#757575] text-center leading-tight group-hover:text-[#1E1E1E]"; // Added group-hover for text color change
  // SCSS: .navItemIcon img, svg
  // Icon color change on hover will be tricky if they are img tags with filters.
  // If they were SVGs, text color could work. For now, relying on Tooltip and direct click.
  const navItemIconClasses = "w-6 h-6 text-[#1E1E1E] group-hover:text-[#007bff]"; // Placeholder for icon color change if applicable

  return (
    <div
      className={`${sidebarBaseClasses} ${isOverlayMode ? 'fixed z-50' : ''}`}
      style={{
        ...(isOverlayMode ? sx : {}),
        width: !isOverlayMode ? (isSidebarCollapsed ? collapsedPaneWidth : expandedPaneWidth) : (sx?.width || 'auto'),
        // overflowY will be handled by panes
      }}
    >
      <SidebarHeader isSidebarCollapsed={isSidebarCollapsed} />

      <div 
        className={slidingContainerClasses}
        style={{
          width: slidingContainerDynamicWidth,
          transform: isSidebarCollapsed
            ? `translateX(-${expandedPaneWidth})`
            : "translateX(0px)",
          willChange: 'transform', // from SCSS
        }}
      >
        {/* Expanded Pane */}
        <div className={expandedPaneClasses} style={{ width: expandedPaneWidth }}>
          <div className={expandedContentAreaClasses}>
            <ProjectPanel onNewChat={handleNewChat} />
            <AccessPanel onLockServiceClick={handleLockServiceClick} />
            <div className={sidebarContentClasses}>
              <ChatList />
            </div>
          </div>
        </div>

        {/* Collapsed Pane */}
        <div className={collapsedPaneClasses} style={{ width: collapsedPaneWidth }}>
          <div className={collapsedNavMenuClasses}>
            {navItems.map((item) => (
              <Tooltip title={item.text} placement="right" key={item.id}>
                {/* Adding 'group' class for hover effects on children */}
                <div className={`${collapsedNavItemClasses} group`} onClick={item.action} role="button" tabIndex={0}>
                  {/* Order changed to match common UI patterns: Icon then Text */}
                  <div className={navItemIconClasses}>{item.icon}</div>
                  <div className={navItemTextClasses}>{item.text}</div> 
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
