import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ListItem, ListItemText, IconButton, Menu, MenuItem, TextField, Box, ListItemButton } from '@mui/material';

import styles from "./chat-list.module.scss";
// import { ChatSession } from "@/app/store/chat"; // Type likely comes from types/session
import type { ChatSession } from "@/app/types/session"; // Adjusted path

import DeleteOutline from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { FormattedDate } from '@/app/components/FormattedDate'; // Assuming this exists
import Locale from '@/app/locales';
import { EncryptionService } from '@/app/services/EncryptionService'; // Import Encryption Service

interface ChatItemProps {
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  session: ChatSession; // Pass the whole session object
  selected: boolean;
  index: number;
  narrow?: boolean;
}

// Animation configuration
const DECRYPTION_INTERVAL_MS = 50; // Speed of letter reveal (milliseconds)

export function ChatItem({
  session,
  selected,
  onClick,
  onDelete,
  onRename,
  narrow,
}: ChatItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.topic);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const listItemRef = useRef<HTMLDivElement | null>(null); // Corrected Ref type for ListItemButton (defaults to div)

  // Update edit value if the session topic changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(session.topic);
    }
  }, [session.topic, isEditing]);

  // Scroll into view when selected
  useEffect(() => {
    if (selected && itemRef.current) {
      itemRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [selected]);

  // Calculate menu position
  useEffect(() => {
    if (showMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: Math.min(
          rect.left + window.scrollX,
          window.innerWidth - 150 // 150 = approximate dropdown width + padding
        ),
      });
    }
  }, [showMenu]);

  // Event handlers
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
    setEditValue(session.topic);
    setShowMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.();
    setShowMenu(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(session.topic);
    }
  };

  const handleSaveEdit = () => {
    if (
      editValue.trim() !== '' &&
      editValue !== session.topic &&
      onRename
    ) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  // Close menu/edit on outside click
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (isEditing && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        handleSaveEdit();
      }
    },
    [showMenu, isEditing, handleSaveEdit] // Added handleSaveEdit dependency
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // --- Animation State ---
  const decryptedTopic = session.topic || Locale.Store.DefaultTopic; // The final target text
  const [displayedTitle, setDisplayedTitle] = useState(decryptedTopic); // Initially show decrypted (or default)
  const [isAnimating, setIsAnimating] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // --- End Animation State ---

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent click from selecting the item
    setAnchorEl(event.currentTarget);
    setIsHovered(false); // Explicitly set hover to false, menu 'open' state will manage visibility
  };

  const handleMenuClose = (event?: React.MouseEvent<HTMLElement> | {}, reason?: "backdropClick" | "escapeKeyDown") => {
    // Check if event is a MouseEvent before stopping propagation
    if (event && typeof event === 'object' && 'stopPropagation' in event && typeof event.stopPropagation === 'function') {
        (event as React.MouseEvent<HTMLElement>).stopPropagation();
    }
    const menuWasPreviouslyOpen = Boolean(anchorEl);
    setAnchorEl(null); // This will make 'open' false

    if (menuWasPreviouslyOpen) {
        // After menu is marked to close, check actual hover state of the item using a zero-delay setTimeout.
        setTimeout(() => {
          if (listItemRef.current) {
            const isCurrentlyHoveredOverItem = listItemRef.current.matches(':hover');
            setIsHovered(isCurrentlyHoveredOverItem);
          }
        }, 0); // Use setTimeout with 0 delay
    }
  };

  const handleEdit = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setEditValue(decryptedTopic); // Start editing with the actual decrypted topic
    setIsEditing(true);
    handleMenuClose();
  };

  const handleCancelEdit = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    setIsEditing(false);
    setEditValue(decryptedTopic); // Revert to original decrypted topic
    handleMenuClose(); // Close menu if open
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  // --- Decryption Animation Effect ---
  useEffect(() => {
    // Only animate if the topic is not the default placeholder
    if (session.topic && session.topic !== Locale.Store.DefaultTopic) {
      setIsAnimating(true);
      // 1. Get the temporary encrypted representation for the animation start
      const encryptedDisplay = session.topic;
      setDisplayedTitle(encryptedDisplay); // Show encrypted version first

      // Clear any existing interval
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }

      let revealedCount = 0;
      const targetLength = decryptedTopic.length;
      const encryptedLength = encryptedDisplay.length;

      // 2. Start the interval to reveal decrypted characters
      animationIntervalRef.current = setInterval(() => {
        revealedCount++;
        // Construct the title: part decrypted, part encrypted
        const newTitle =
          decryptedTopic.substring(0, revealedCount) +
          encryptedDisplay.substring(revealedCount);

        setDisplayedTitle(newTitle);

        // 3. Stop when the full decrypted title is shown
        if (revealedCount >= targetLength && revealedCount >= encryptedLength) {
             if (animationIntervalRef.current) {
               clearInterval(animationIntervalRef.current);
               animationIntervalRef.current = null;
             }
             setDisplayedTitle(decryptedTopic); // Ensure final state is perfect
             setIsAnimating(false);
        }
      }, DECRYPTION_INTERVAL_MS);

    } else {
        // If it's the default topic or empty, just display it directly, no animation
        setDisplayedTitle(decryptedTopic);
        setIsAnimating(false);
         // Clear interval if it was running for a previous topic
         if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
         }
    }

    // Cleanup function to clear interval on unmount or if session.topic changes
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [session.topic, decryptedTopic]); // Rerun effect if the underlying topic changes
  // --- End Decryption Animation Effect ---

  const handleItemClick = () => {
    if (isAnimating) {
        // If animating, stop animation and show full title immediately
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
        setDisplayedTitle(decryptedTopic);
        setIsAnimating(false);
    }
    onClick?.(); // Proceed with original click handler
  };

  const open = Boolean(anchorEl);

  return (
    <ListItemButton
      ref={listItemRef} // Add ref here
      onClick={handleItemClick} // Use the wrapper click handler
      className={styles['chat-item']} // Use the base class
      disableTouchRipple={true} // Disable the MUI ripple effect
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ 
          padding: 0, 
          minHeight: '50px', 
          alignItems: 'stretch', 
          '&:hover': {
            backgroundColor: 'transparent',
          },
      }}
    >
        {/* Highlight Container - Apply conditional class here */}
        <Box className={clsx(styles['chat-item-highlight'], selected && styles['chat-item-selected-highlight'])} 
             sx={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 width: '100%', 
                 paddingRight: ((isHovered || open) && !isEditing) ? '50px' : '12px',
             }}>
            {/* Secondary action container needs to be inside highlight or positioned absolutely relative to chat-item */}
            <Box sx={{ 
                position: 'absolute', 
                right: 12, // Adjust position based on new padding
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 1, // Ensure it's above the text
                display: ((isHovered || open) && !isEditing) ? 'flex' : 'none',
                alignItems: 'center',
            }}>
                {!isEditing && (
                  <>
                    <IconButton edge="end" aria-label="actions" onClick={handleMenuClick} size="small">
                      <MoreVertIcon fontSize="small" sx={{ color: 'white' }} />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={open} // Use state variable
                      onClose={handleMenuClose}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MenuItem onClick={handleEdit}>{Locale.Chat.Actions.Edit}</MenuItem>
                      <MenuItem onClick={handleDelete}>{Locale.Chat.Actions.Delete}</MenuItem>
                    </Menu>
                  </>
                )}
            </Box>

            {/* Main content area - Conditional rendering */}
            {isEditing ? (
                // Editing state: Box + TextField
                <Box component="form" onSubmit={handleSaveEdit} sx={{ width: '100%', flexGrow: 1 /* Make Box grow */ }}>
                    <TextField 
                      className={styles["chat-item-title-input"]}
                      value={editValue}
                      onChange={handleEditChange}
                      onKeyDown={handleEditKeyDown}
                      onBlur={() => { setTimeout(() => handleSaveEdit(), 100); }}
                      onClick={(e) => e.stopPropagation()}
                      inputRef={editInputRef}
                      autoFocus
                      variant="standard"
                      InputProps={{ 
                          disableUnderline: true, 
                      }} 
                      // Keep refined TextField styles 
                      sx={{
                        width: '100%',
                        margin: 0,
                        padding: 0,
                        '& .MuiInputBase-root': {
                           marginTop: '0',
                           padding: '0', 
                           height: 'auto', 
                           lineHeight: 'inherit',
                        },
                        '& .MuiInputBase-input': {
                          padding: '0', 
                          fontSize: 'inherit', 
                          fontFamily: 'inherit',
                          fontWeight: 'inherit', 
                          lineHeight: 'inherit', 
                          height: 'auto', 
                          color: 'inherit',
                        },
                      }}
                    />
                </Box>
            ) : (
                // Non-editing state: Span
                // We will add flexGrow to this span via CSS module
                <span className={styles['chat-item-title']} title={decryptedTopic}>
                    {displayedTitle}
                </span>
            )}
        </Box> {/* End Highlight Container */}
    </ListItemButton>
  );
} 