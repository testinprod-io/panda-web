"use client";

import { useState, useMemo, useEffect, useRef } from "react";
// MUI Component imports are removed as they will be replaced
// import {
//   Box,
//   IconButton,
//   Tooltip,
//   Button,
//   Avatar,
//   Menu,
//   MenuItem,
//   ListItemIcon,
//   ListItemText,
//   Typography,
//   Divider,
// } from "@mui/material";
// import Person2RoundedIcon from "@mui/icons-material/Person2Rounded";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAppConfig, useChatStore } from "@/store";
import { ModelConfig, DEFAULT_MODELS, ModelType } from "@/types/constant"; // ModelType might be used
import LoginSignupPopup from "./login-signup-popup";
// import styles from "./chat-header.module.scss"; // SCSS import removed
import clsx from "clsx";
import { useRouter } from "next/navigation";

// Placeholder for icons - replace with actual SVGs or a library
const IconPlaceholder = ({ name, className, size = '24px' }: { name: string, className?: string, size?: string }) => (
  <span className={clsx("inline-block text-sm", className)} style={{ width: size, height: size }}>[{name}]</span>
);
const ExpandMoreIcon = () => <IconPlaceholder name="V" size="16px" />;
const WarningAmberOutlinedIcon = () => <IconPlaceholder name="!Warn" className="text-yellow-500" />;
const Person2RoundedIcon = () => <IconPlaceholder name="User" />;

interface ChatHeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

type EncryptionStatus = "SUCCESSFUL" | "FAILED" | "IN_PROGRESS";

export default function ChatHeader({
  isSidebarCollapsed,
  onToggleSidebar,
  isMobile,
}: ChatHeaderProps) {
  const { login, logout, user } = usePrivy();
  const { isReady, isAuthenticated } = useAuthStatus();
  const { models: availableModels, setApiProvider, modelConfig: globalModelConfig } = useAppConfig();

  const currentSession = useChatStore((state) => state.currentSession());
  const activeSessionModelName = currentSession?.modelConfig?.name;
  const activeSessionModelDisplayName = currentSession?.modelConfig?.displayName;
  
  const globalModelIdentifier = globalModelConfig.model; // Assuming modelConfig.model exists and is the identifier
  const globalModelName = globalModelConfig.name;
  const globalModelDisplayName = globalModelConfig.displayName;

  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchorEl);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [modelAnchorEl, setModelAnchorEl] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelAnchorEl);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>("SUCCESSFUL");

  // Event listener for closing menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node) && profileAnchorEl && !profileAnchorEl.contains(event.target as Node)) {
        setProfileAnchorEl(null);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node) && modelAnchorEl && !modelAnchorEl.contains(event.target as Node)) {
        setModelAnchorEl(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileAnchorEl, modelAnchorEl]); // Dependencies

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(profileAnchorEl ? null : event.currentTarget); // Toggle behavior
  };
  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleModelClick = (event: React.MouseEvent<HTMLElement>) => {
    setModelAnchorEl(modelAnchorEl ? null : event.currentTarget); // Toggle behavior
  };
  const handleModelClose = () => {
    setModelAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileClose();
    logout();
  };

  const handleModelSelect = (modelName: ModelType) => {
    const selectedModelDetails = availableModels.find((m) => m.name === modelName);
    if (selectedModelDetails && selectedModelDetails.available) {
      setApiProvider(modelName); // Assuming setApiProvider takes the model name or ModelType
    }
    handleModelClose();
  };

  const handleOpenLoginPopup = () => {
    setIsLoginPopupOpen(true);
  };

  const handleCloseLoginPopup = () => {
    setIsLoginPopupOpen(false);
  };

  const handlePopupLogin = () => {
    login(); // Assuming login() handles Privy login flow
  };

  const handlePopupSignup = () => {
    // Often, signup also initiates a login flow or a similar auth process
    login(); // Or a specific signup function if available via usePrivy
  };

  const router = useRouter();
  const store = useChatStore();

  const handleNewChat = () => {
    store.setCurrentSessionIndex(-1); // Reset to no active session
    router.push(`/`); // Navigate to home or new chat page
  };

  const displayModelName =
    activeSessionModelDisplayName ||
    activeSessionModelName ||
    globalModelDisplayName ||
    globalModelName ||
    DEFAULT_MODELS[0].config.displayName;

  // Determine the model name that should be considered 'selected' in the menu
  const currentModelNameForSelectionLogic =
    activeSessionModelName || globalModelIdentifier; // Use identifier from global config as fallback

  const modelsToDisplay = useMemo(() => {
    // Potentially filter or transform models here if needed in future
    return availableModels;
  }, [availableModels]);

  // Cycle through encryption states for demo
  const cycleEncryptionStatus = () => {
    setEncryptionStatus((prevStatus) => {
      if (prevStatus === "SUCCESSFUL") return "IN_PROGRESS";
      if (prevStatus === "IN_PROGRESS") return "FAILED";
      return "SUCCESSFUL";
    });
  };

  const getEncryptionStatusInfo = () => {
    switch (encryptionStatus) {
      case "SUCCESSFUL":
        return {
          text: "Encryption Activated",
          bgColor: "bg-lime-300", // Tailwind class for background
          textColor: "text-gray-800", // Tailwind class for text
          icon: "/icons/lock.svg", 
        };
      case "FAILED":
        return {
          text: "Encryption Failed",
          bgColor: "bg-pink-300", 
          textColor: "text-red-800",
          icon: "/icons/lock.svg", // Consider specific fail icon
        };
      case "IN_PROGRESS":
        return {
          text: "Encryption Activating",
          bgColor: "bg-sky-300",
          textColor: "text-blue-800",
          icon: "/icons/lock.svg", // Consider specific progress icon
        };
      default: // Should not happen
        return {
          text: "Status Unknown",
          bgColor: "bg-gray-300",
          textColor: "text-black",
          icon: "/icons/lock.svg",
        };
    }
  };

  const currentStatusInfo = getEncryptionStatusInfo();

  const handleOpenSettings = () => {
    // Attempt to blur the currently focused element (likely the clicked menu item)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleProfileClose(); // Close the profile menu first

    requestAnimationFrame(() => {
      window.location.hash = 'settings'; // Directly set the hash
    });
  };
  
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-6 h-20 md:h-28 flex-shrink-0 bg-white shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* Sidebar Toggle and New Chat Buttons - only if authenticated and sidebar collapsed (on mobile) */}
        {isReady && isAuthenticated && isMobile && isSidebarCollapsed && (
          <>
            <button 
              title="Reveal Sidebar" 
              onClick={onToggleSidebar} 
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
            >
              <img src="/icons/sidebar.svg" alt="Reveal Sidebar" className="w-6 h-6" />
            </button>
            <button 
              title="New Chat" 
              onClick={handleNewChat} 
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700"
            >
              <img src="/icons/new-chat.svg" alt="New Chat" className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Model Selector and Encryption Status - only if authenticated */}
        {isReady && isAuthenticated && (
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <button
                id="model-selector-button"
                aria-haspopup="true"
                aria-expanded={modelMenuOpen}
                onClick={handleModelClick}
                className="normal-case text-gray-800 text-lg md:text-xl font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {displayModelName}
                <ExpandMoreIcon />
              </button>
              {modelMenuOpen && (
                <div 
                  ref={modelMenuRef} 
                  className="absolute top-full left-0 mt-2 w-64 md:w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-20"
                >
                  {modelsToDisplay.map((model) => {
                    const isSelected = model.name === currentModelNameForSelectionLogic;
                    const isActuallyAvailable = model.available;
                    return (
                      <div
                        key={`${model.provider.id}-${model.name}`}
                        onClick={() => isActuallyAvailable && handleModelSelect(model.name as ModelType)}
                        className={clsx(
                          "font-inter text-sm font-normal leading-loose px-3 py-1.5 rounded-md text-gray-700 flex justify-between items-center",
                          isActuallyAvailable 
                            ? "cursor-pointer hover:bg-gray-100" 
                            : "text-gray-400 cursor-not-allowed opacity-70",
                          isSelected && isActuallyAvailable && "bg-blue-50 text-blue-600 font-medium"
                        )}
                        aria-disabled={!isActuallyAvailable}
                      >
                        <span className="flex-grow min-w-0 mr-2 overflow-hidden break-words whitespace-normal">
                          {model.displayName || model.name}
                        </span>
                        <div className="min-w-[24px] h-6 flex items-center justify-center shrink-0">
                          {isSelected && isActuallyAvailable && <img src="/icons/check.svg" alt="Selected" className="w-5 h-5 text-blue-600" />}
                          {!isActuallyAvailable && <WarningAmberOutlinedIcon />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Encryption Status Display */}
            {isAuthenticated && (
              <div 
                title="Click to cycle status (Dev only)" 
                onClick={cycleEncryptionStatus} 
                className={clsx(
                  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer text-xs md:text-sm",
                  currentStatusInfo.bgColor, 
                  currentStatusInfo.textColor
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <img src={currentStatusInfo.icon} alt="status icon" className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <span className={clsx("font-medium hidden sm:inline")}>
                  {currentStatusInfo.text}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Right section - Placeholder, to be added in next step */}
      <div className="flex items-center">
        {!isReady ? (
          <div className="w-20 h-9 bg-gray-200 rounded-md animate-pulse" />
        ) : isAuthenticated ? (
          <div className="relative">
            <button 
              title={user?.email?.address || "Profile"} 
              onClick={handleProfileClick} 
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-200 hover:bg-gray-300 cursor-pointer flex items-center justify-center text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {user?.email?.address ? user.email.address.charAt(0).toUpperCase() : <Person2RoundedIcon />}
            </button>
            {profileMenuOpen && (
              <div 
                ref={profileMenuRef}
                className="absolute top-full right-0 mt-3 w-64 md:w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-20"
              >
                <div className="flex items-center gap-3 px-2 py-1.5 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-sm shrink-0">
                    {user?.email?.address ? user.email.address.charAt(0).toUpperCase() : <Person2RoundedIcon />}
                  </div>
                  <span className="text-gray-700 text-sm font-normal leading-snug break-all line-clamp-2">
                    {user?.wallet?.address || user?.email?.address || "test@example.com"}
                  </span>
                </div>
                <hr className="my-1.5 border-gray-200" />
                {[ 
                  { label: "Help & FAQ", icon: "/icons/help.svg", action: () => { handleProfileClose(); } },
                  { label: "Settings", icon: "/icons/settings.svg", action: handleOpenSettings },
                  { label: "Log out", icon: "/icons/logout.svg", action: handleLogout },
                ].map(item => (
                  <div 
                    key={item.label} 
                    onClick={item.action} 
                    className="px-2 py-2 rounded-md hover:bg-gray-100 cursor-pointer flex items-center gap-2.5 text-sm text-gray-700"
                  >
                    <div className="flex items-center shrink-0">
                       <img src={item.icon} alt={item.label} className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="font-normal">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={handleOpenLoginPopup} 
            className="bg-gray-800 text-white font-inter text-sm font-normal leading-normal px-4 py-1.5 rounded-full h-8 md:h-9 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Log in/Sign up
          </button>
        )}
      </div>
      <LoginSignupPopup
        open={isLoginPopupOpen}
        onClose={handleCloseLoginPopup}
        onLogin={handlePopupLogin}
        onSignup={handlePopupSignup}
      />
    </div>
  );
}
