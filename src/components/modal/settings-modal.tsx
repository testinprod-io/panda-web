"use client";

import { useState, useCallback } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem as SelectMenuItem, // Renamed to avoid conflict with Menu's MenuItem
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // For back navigation
import styles from "./settings-modal.module.scss";
import { SettingsPage } from './settings-modal-handler'; // Import the type
import CustomizePromptsView from '../customize-prompts-view'; // Import the new view
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // For navigation
import { useApiClient } from "@/providers/api-client-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useChatStore } from "@/store";
import clsx from "clsx";
import Locale from "@/locales"; // Added Locale import

interface SettingsModalProps {
  open: boolean;
  currentPage: SettingsPage | null; // Added prop
  onClose: () => void;
}

// ActiveSettingSection is for the left nav, not the overall page
type ActiveSettingSection = "general" | "faq";

export default function SettingsModal({ open, currentPage, onClose }: SettingsModalProps) {
  const [activeNavSection, setActiveNavSection] =
    useState<ActiveSettingSection>("general");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false); // New state for prompts modal

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, logout } = usePrivy();

  if (!authenticated) {
    return <div>Not authenticated</div>;
  }

  const { clearSessions } = useChatStore();
  const apiClient = useApiClient();

  const navigateTo = (hash: string) => {
    const currentSearchParams = searchParams.toString();
    const newUrl = `${pathname}${currentSearchParams ? '?' + currentSearchParams : ''}${hash}`;
    router.push(newUrl, { scroll: false });
  };

  const handleCloseModal = () => {
    onClose(); // This will clear the hash via SettingsModalHandler
  };

  const handleLogOut = () => {
    router.replace('/');
    logout();
    console.log("Log out on this device clicked");
  };

  const handleDeleteAllChats = () => {    
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAllChats = () => {
    apiClient.app.deleteConversations();
    clearSessions();
    router.replace('/');
    console.log("All chats deleted after confirmation");
    setDeleteConfirmOpen(false);
  };

  // Mock data and handlers for general settings
  const [theme, setTheme] = useState("light");
  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value);
  };

  const generalSettingsItems = [
    {
      label: "Theme",
      control: (
        <div className="relative min-w-[150px]">
          <select 
            value={theme} 
            onChange={handleThemeChange} 
            className={clsx(
                "block w-full appearance-none bg-white border border-gray-300 hover:border-gray-400 px-3 py-1.5 pr-8 rounded-md shadow-sm text-sm",
                "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
                "text-gray-800 font-medium font-inter"
            )}
          >
            <option value="light">Light mode</option>
            <option value="dark">Dark mode</option>
            <option value="system">System</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ExpandMoreIcon />
          </div>
        </div>
      ),
    },
    {
      label: "Custom instructions",
      control: (
        <button
          onClick={() => setIsPromptsModalOpen(true)}
          className={clsx(
            "inline-flex items-center text-sm font-medium font-inter rounded-full",
            "text-gray-800 hover:bg-gray-100 px-1 py-1 leading-8"
          )}
        >
          On
          <ChevronRightIcon />
        </button>
      ),
    },
    {
      label: "Delete all chats",
      control: (
        <button
          onClick={handleDeleteAllChats}
          className={clsx(
            "px-4 py-1.5 text-sm font-medium font-inter rounded-full leading-8 shadow-none",
            "bg-red-600 text-red-50 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          )}
        >
          Delete
        </button>
      ),
    },
    {
      label: "Log out on this device",
      control: (
        <button
          onClick={handleLogOut}
          className={clsx(
            "px-4 py-1.5 text-sm font-medium font-inter rounded-full leading-8",
            "border border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          )}
        >
          Log out
        </button>
      ),
    },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'general':
      default:
        return (
          <div className="flex flex-col">
            {generalSettingsItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                <span className="text-sm text-gray-800 font-inter">{item.label}</span>
                <div className="flex items-center">{item.control}</div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <>
      <div 
        className={clsx(
          "fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300",
          open ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={handleCloseModal} 
      >
        <div 
          className={clsx(
            "bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden outline-none border border-gray-300",
            "w-full max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] min-w-[320px] sm:min-w-[512px]"
          )}
          onClick={(e) => e.stopPropagation()} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="settings-modal-title"
        >
          <div className="flex justify-between items-center px-6 md:px-8 py-4 border-b border-gray-200 shrink-0">
            <h2 id="settings-modal-title" className="text-lg font-semibold text-gray-800 font-inter">
              Settings
            </h2>
            <button
              aria-label="close settings"
              onClick={handleCloseModal}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex flex-grow overflow-hidden p-4 sm:p-6 md:p-3">
            <nav className="w-[160px] md:w-[200px] pr-3 md:pr-4 shrink-0 overflow-y-auto border-r border-gray-200">
              <ul className="flex flex-col gap-1">
                <li>
                  <button 
                    className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left font-medium",
                        activeNavSection === "general" 
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setActiveNavSection("general")}
                  >
                    <SettingsIcon /> General
                  </button>
                </li>
                <li>
                  <button 
                     className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left font-medium",
                        activeNavSection === "faq" 
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setActiveNavSection("faq")}
                  >
                    <HelpOutlineIcon /> Help & FAQ
                  </button>
                </li>
              </ul>
            </nav>
            
            <div className="flex-grow pl-3 md:pl-4 pr-1 overflow-y-auto">
              {activeNavSection === 'general' && renderContent()} 
              {activeNavSection === 'faq' && (
                 <div className="p-1">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Help & FAQ</h3>
                    <p className="text-sm text-gray-600">This is where help and FAQ content will go.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPromptsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 opacity-100 visible"
          onClick={() => setIsPromptsModalOpen(false)}
        >
          <div 
            className={clsx(
              "bg-white shadow-xl rounded-lg flex flex-col overflow-hidden outline-none",
              "w-[clamp(300px,80vw,650px)] max-h-[90vh]"
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="customize-prompts-modal-title"
          >
            <CustomizePromptsView onCloseRequest={() => setIsPromptsModalOpen(false)} />
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 opacity-100 visible">
          <div 
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm md:max-w-md"
            role="alertdialog" 
            aria-modal="true" 
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
          >
            <h3 id="delete-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Delete
            </h3>
            <p id="delete-confirm-description" className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete all your chats? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmOpen(false)} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteAllChats} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                autoFocus
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 