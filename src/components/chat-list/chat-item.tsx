import React, { useRef, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
// MUI Imports Removed
// import { ListItemText, IconButton, Menu, MenuItem, TextField, Box, ListItemButton, ListItemIcon } from '@mui/material';

// import styles from "./chat-list.module.scss";
import type { ChatSession } from "@/types/session";
import Locale from '@/locales';
import { useEncryption } from "@/providers/encryption-provider";
import { EncryptionService } from "@/services/EncryptionService";

// Icon Placeholders
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => <span className={clsx("inline-block text-xs p-0.5 border rounded", className)}>[{name}]</span>;
const MoreVertIconPlaceholder = () => <IconPlaceholder name="..." className="w-6 h-6" />;
const EditOutlinedIconPlaceholder = () => <IconPlaceholder name="Edit" className="w-4 h-4" />;
const DeleteOutlineOutlinedIconPlaceholder = () => <IconPlaceholder name="Del" className="w-4 h-4" />;

interface ChatItemProps {
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  onShare?: () => void;
  onArchive?: () => void;
  session: ChatSession;
  selected: boolean;
  index: number;
  narrow?: boolean;
}

const DECRYPTION_INTERVAL_MS = 50;

export function ChatItem({
  session,
  selected,
  onClick,
  onDelete,
  onRename,
  onShare,
  onArchive,
  narrow,
}: ChatItemProps) {
  const listItemRef = useRef<HTMLButtonElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { isLocked } = useEncryption();
  const [displayedTitle, setDisplayedTitle] = useState(session.visibleTopic);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const topic = session.topic || Locale.Store.DefaultTopic;
    let initialDisplay = topic;
    if (!isLocked && session.topic) {
      try {
        initialDisplay = EncryptionService.decryptChatMessageContent(topic);
      } catch (e) { console.error("[ChatItem] Decryption failed for initial display"); initialDisplay = topic; /* Show raw on error */ }
    }
    session.visibleTopic = initialDisplay; // Update visibleTopic directly for consistency
    setDisplayedTitle(initialDisplay);
    if (!isEditing) setEditValue(initialDisplay);
  }, [isLocked, session, session.topic, isEditing]); // session.topic to re-evaluate if topic itself changes

  useEffect(() => {
    if (selected && listItemRef.current) {
      listItemRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selected]);

  // Decryption Animation Effect (modified to use session.visibleTopic as definitive target)
  useEffect(() => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    const rawTopic = session.topic || Locale.Store.DefaultTopic;
    const targetDecryptedTopic = session.visibleTopic; // This should be the already decrypted or raw topic

    if (isLocked || rawTopic === Locale.Store.DefaultTopic || !session.topic || rawTopic === targetDecryptedTopic || displayedTitle === targetDecryptedTopic) {
      setDisplayedTitle(targetDecryptedTopic);
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    let currentDisplay = rawTopic;
    setDisplayedTitle(currentDisplay);
    let revealedCount = 0;

    animationIntervalRef.current = setInterval(() => {
      revealedCount++;
      if (revealedCount > targetDecryptedTopic.length && revealedCount > currentDisplay.length) {
         // Safety break or if target is shorter than raw for some reason
         if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
         setDisplayedTitle(targetDecryptedTopic);
         setIsAnimating(false);
         return;
      }
      currentDisplay = targetDecryptedTopic.substring(0, revealedCount) + currentDisplay.substring(revealedCount);
      setDisplayedTitle(currentDisplay);
      if (currentDisplay === targetDecryptedTopic) {
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
        setIsAnimating(false);
      }
    }, DECRYPTION_INTERVAL_MS);
    return () => { if (animationIntervalRef.current) clearInterval(animationIntervalRef.current); };
  }, [session.topic, session.visibleTopic, isLocked, displayedTitle]); // displayedTitle added to dependencies to stop animation if manually set
  
  const handleItemClick = () => {
    if (isAnimating) {
      if (animationIntervalRef.current) { clearInterval(animationIntervalRef.current); animationIntervalRef.current = null; }
      setDisplayedTitle(session.visibleTopic);
      setIsAnimating(false);
    }
    if (!isEditing) onClick?.();
  };

  const handleMenuToggle = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };
  const closeMenu = () => setAnchorEl(null);
  const handleEdit = (event: React.MouseEvent<HTMLElement>) => { event.stopPropagation(); setIsEditing(true); setEditValue(session.visibleTopic); closeMenu(); };
  const handleDelete = (event: React.MouseEvent<HTMLElement>) => { event.stopPropagation(); onDelete?.(); closeMenu(); };
  const handleSaveEdit = () => { if (editValue.trim() !== "" && editValue !== session.visibleTopic && onRename) { onRename(editValue.trim()); } setIsEditing(false); };

  useEffect(() => { if (isEditing && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [isEditing]);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      // Close menu if click is outside the menu button and the menu itself
      if (anchorEl && !anchorEl.contains(targetNode) && 
          (!listItemRef.current || !listItemRef.current.querySelector("[data-menu-paper]")?.contains(targetNode))) {
        closeMenu();
      }
      // Save edit if click is outside the input and not on the menu trigger
      if (isEditing && editInputRef.current && !editInputRef.current.contains(targetNode)) {
        const menuButton = listItemRef.current?.querySelector("[aria-label='actions']");
        if (!menuButton || (menuButton && !menuButton.contains(targetNode))) {
            handleSaveEdit();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl, isEditing, handleSaveEdit]); // Re-added handleSaveEdit to deps

  return (
    <button
      ref={listItemRef} 
      onClick={handleItemClick} 
      className={clsx(
        "flex items-center mx-auto w-[316px] h-12 rounded-lg cursor-pointer relative user-select-none p-0 overflow-hidden transition-colors duration-200 ease-in-out text-left",
        !selected && "hover:bg-gray-100",
        selected && "bg-gray-200"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-current={selected ? "page" : undefined}
    >
        <div className={clsx(
            "flex items-center w-full h-full px-3 py-2 box-border",
            {"pr-12": !isEditing }
        )}>
            <div className={clsx(
                "absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center",
                (isHovered || menuOpen) && !isEditing ? "opacity-100" : "opacity-0 group-focus-within:opacity-100",
                isEditing && "opacity-0"
            )}>
                {!isEditing && (
                  <>
                    <button 
                      aria-label="actions" 
                      onClick={handleMenuToggle} 
                      className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 data-[state=open]:bg-gray-200"
                      data-state={menuOpen ? "open" : "closed"}
                    >
                      <MoreVertIconPlaceholder />
                    </button>
                    {menuOpen && anchorEl && (
                        <div 
                            data-menu-paper
                            className={clsx(
                                "absolute right-0 mt-1 w-40 origin-top-right bg-white rounded-xl shadow-lg border border-gray-200 focus:outline-none z-20",
                                "p-2 flex flex-col gap-1.5"
                            )}
                            style={{ top: anchorEl.offsetTop + anchorEl.offsetHeight + 4, left: anchorEl.offsetLeft - 160 + anchorEl.offsetWidth }}
                            role="menu" aria-orientation="vertical" aria-labelledby="actions-button"
                        >
                            <button
                                onClick={handleEdit}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-left"
                                role="menuitem"
                            >
                                <EditOutlinedIconPlaceholder />
                                <span className="flex-grow text-gray-800 font-inter text-base">Rename</span>
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 rounded-md hover:bg-red-50 focus:bg-red-50 focus:outline-none text-left"
                                role="menuitem"
                            >
                                <DeleteOutlineOutlinedIconPlaceholder />
                                <span className="flex-grow font-inter text-base">Delete</span>
                            </button>
                        </div>
                    )}
                  </>
                )}
            </div>

            {/* Title or Edit Input */}
            {isEditing ? (
                <form 
                    className="flex-grow w-full" 
                    onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}
                >
                    <input 
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditing(false); setEditValue(session.visibleTopic); } else if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); } }}
                      onBlur={handleSaveEdit} 
                      onClick={(e) => e.stopPropagation()} // Prevent item click while editing
                      ref={editInputRef}
                      autoFocus
                      className={clsx(
                        "w-full bg-transparent p-0 text-base font-normal font-inter leading-normal", // Base from .chat-item-title-input and TextField
                        "text-gray-800 dark:text-white", // Assuming a dark mode variant might be needed eventually
                        "focus:outline-none focus:ring-0 border-none shadow-none" // Remove default input chrome
                      )}
                      aria-label="Edit chat title"
                    />
                </form>
            ) : (
                <span 
                    className={clsx(
                        "flex-grow min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-gray-800 font-inter text-base font-normal"
                    )}
                    title={session.visibleTopic}
                >
                    {displayedTitle}
                </span>
            )}
        </div> 
    </button>
  );
} 