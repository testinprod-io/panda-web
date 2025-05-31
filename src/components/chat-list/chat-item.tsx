import React, { useRef, useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import { ListItemText, IconButton, Menu, MenuItem, TextField, Box, ListItemButton, ListItemIcon } from '@mui/material';

import styles from "./chat-list.module.scss";
import type { ChatSession } from "@/types/session"; // Adjusted path

import MoreVertIcon from '@mui/icons-material/MoreVert';
import Locale from '@/locales';
import { useEncryption } from "@/providers/encryption-provider"; // Added
import { EncryptionService } from "@/services/encryption-service"; // Added

// New Icons based on Figma
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';         // For Rename
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'; // For Delete

interface ChatItemProps {
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  onShare?: () => void; // Placeholder for Share action
  onArchive?: () => void; // Placeholder for Archive action
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
  onShare,   // Destructure new prop
  onArchive, // Destructure new prop
  narrow,
}: ChatItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(""); // Initialized with actualDecryptedTopic later
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const listItemRef = useRef<HTMLDivElement | null>(null);

  const { isLocked } = useEncryption();
  // const [actualDecryptedTopic, setActualDecryptedTopic] = useState(session.topic || Locale.Store.DefaultTopic);
  const [displayedTitle, setDisplayedTitle] = useState(session.visibleTopic);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [visibleTopic, setVisibleTopic] = useState(session.visibleTopic);

  useEffect(() => {
    const topic = session.topic || Locale.Store.DefaultTopic;
    if (isLocked) {
      // session.visibleTopic = topic;
      setVisibleTopic(topic);
    } else {
      // session.visibleTopic = EncryptionService.decrypt(topic);
      setVisibleTopic(EncryptionService.decrypt(topic));
    }
  }, [isLocked, session.topic]);

  // Update editValue when actualDecryptedTopic changes and not editing
  useEffect(() => {
    if (!isEditing) {
      // setEditValue(session.visibleTopic);
      setEditValue(visibleTopic);
    }
  // }, [session.visibleTopic, isEditing]);
  }, [visibleTopic, isEditing]);

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
  
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(session.visibleTopic); // Revert to actual decrypted topic
    }
  };

  const handleSaveEdit = () => {
    if (
      editValue.trim() !== '' &&
      editValue !== session.visibleTopic && // Compare with actual decrypted topic
      onRename
    ) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node) && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (isEditing && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        // Check if the click is outside the edit input specifically
        if (editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
            handleSaveEdit();
        }
      }
    },
    [showMenu, isEditing, handleSaveEdit] 
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setIsHovered(false); 
  };

  const handleMenuClose = (event?: React.MouseEvent<HTMLElement> | {}, reason?: "backdropClick" | "escapeKeyDown") => {
    if (event && typeof event === 'object' && 'stopPropagation' in event && typeof event.stopPropagation === 'function') {
        (event as React.MouseEvent<HTMLElement>).stopPropagation();
    }
    const menuWasPreviouslyOpen = Boolean(anchorEl);
    setAnchorEl(null); 

    if (menuWasPreviouslyOpen) {
        setTimeout(() => {
          if (listItemRef.current) {
            const isCurrentlyHoveredOverItem = listItemRef.current.matches(':hover');
            setIsHovered(isCurrentlyHoveredOverItem);
          }
        }, 0);
    }
  };

  const handleEdit = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    // setEditValue(session.visibleTopic); // Start editing with the actual decrypted topic
    setEditValue(visibleTopic); // Start editing with the actual decrypted topic
    setIsEditing(true);
    handleMenuClose();
  };

  const handleCancelEdit = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    setIsEditing(false);
    // setEditValue(session.visibleTopic); // Revert to original decrypted topic
    setEditValue(visibleTopic); // Revert to original decrypted topic
    handleMenuClose(); 
  };

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  // Decryption Animation Effect
  useEffect(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    const rawTopic = session.topic || Locale.Store.DefaultTopic;

    if (isLocked || rawTopic === Locale.Store.DefaultTopic || !session.topic) {
      // If locked, or it's the default topic, or no session topic, just display the actual (possibly raw) topic
      setDisplayedTitle(session.topic);
      setIsAnimating(false);
      return;
    }

    // App is unlocked and it's not a default topic, proceed with animation
    setIsAnimating(true);
    // Start animation from the raw (potentially encrypted) topic
    const animationStartDisplay = rawTopic; 
    setDisplayedTitle(animationStartDisplay);

    let revealedCount = 0;
    // const targetLength = session.visibleTopic.length;
    const targetLength = visibleTopic.length;
    const startDisplayLength = animationStartDisplay.length;

    animationIntervalRef.current = setInterval(() => {
      revealedCount++;
      const newTitle =
        // session.visibleTopic.substring(0, revealedCount) +
        visibleTopic.substring(0, revealedCount) +
        animationStartDisplay.substring(revealedCount);

      setDisplayedTitle(newTitle);

      if (revealedCount >= targetLength && revealedCount >= startDisplayLength) {
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }
        // setDisplayedTitle(session.visibleTopic); // Ensure final state is perfect
        setDisplayedTitle(visibleTopic); // Ensure final state is perfect
        setIsAnimating(false);
      }
    }, DECRYPTION_INTERVAL_MS);

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  // }, [session.topic, session.visibleTopic, isLocked]); // Rerun if underlying topic, its decrypted version, or lock state changes
  }, [session.topic, visibleTopic, isLocked]); // Rerun if underlying topic, its decrypted version, or lock state changes

  const handleItemClick = () => {
    if (isAnimating) {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      // setDisplayedTitle(session.visibleTopic);
      setDisplayedTitle(visibleTopic);
      setIsAnimating(false);
    }
    onClick?.();
  };

  const open = Boolean(anchorEl);

  const handleShare = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onShare?.();
    handleMenuClose();
    console.log("Share action triggered for session:", session.id);
  };

  const handleArchive = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onArchive?.();
    handleMenuClose();
    console.log("Archive action triggered for session:", session.id);
  };
  
  const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onDelete?.();
    handleMenuClose();
  };

  return (
    <ListItemButton
      ref={listItemRef} 
      onClick={handleItemClick} 
      className={styles['chat-item']} 
      disableTouchRipple={true} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ 
          padding: 0, 
          minHeight: '48px', 
          alignItems: 'stretch', 
          '&:hover': {
            backgroundColor: 'transparent',
          },
      }}
    >
        <Box className={clsx(styles['chat-item-highlight'], selected && styles['chat-item-selected-highlight'])} 
             sx={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 width: '100%', 
                 paddingRight: ((isHovered || open) && !isEditing) ? '50px' : '12px',
             }}>
            <Box sx={{ 
                position: 'absolute', 
                right: 12, 
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 1, 
                display: ((isHovered || open) && !isEditing) ? 'flex' : 'none',
                alignItems: 'center',
            }}>
                {!isEditing && (
                  <>
                    <IconButton edge="end" aria-label="actions" onClick={handleMenuClick} size="small">
                      <img src="/icons/more.svg" alt="More" style={{ width: '24px', height: '24px' }} />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={open} 
                      onClose={handleMenuClose}
                      onClick={(e) => e.stopPropagation()} 
                      PaperProps={{
                        className: styles.chatActionMenuPaper, 
                      }}
                      MenuListProps={{
                        sx: { 
                          paddingTop: 0, 
                          paddingBottom: 0,
                          display: 'flex',       
                          flexDirection: 'column', 
                          gap: '10px',           
                        }
                      }}
                    >
                      <MenuItem onClick={handleEdit} className={styles.chatActionMenuItem}>
                        <ListItemIcon className={styles.chatActionMenuItemIcon}>
                          <EditOutlinedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Rename" className={styles.chatActionMenuItemText} />
                      </MenuItem>
                      <MenuItem onClick={handleDeleteClick} className={clsx(styles.chatActionMenuItem, styles.deleteAction)}>
                        <ListItemIcon className={clsx(styles.chatActionMenuItemIcon, styles.deleteActionIcon)}>
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Delete" className={clsx(styles.chatActionMenuItemText, styles.deleteActionText)} />
                      </MenuItem>
                    </Menu>
                  </>
                )}
            </Box>

            {isEditing ? (
                <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} sx={{ width: '100%', flexGrow: 1 }}>
                    <TextField 
                      className={styles["chat-item-title-input"]}
                      value={editValue}
                      onChange={handleEditChange}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleSaveEdit} // Save on blur
                      onClick={(e) => e.stopPropagation()}
                      inputRef={editInputRef}
                      autoFocus
                      variant="standard"
                      InputProps={{ 
                          disableUnderline: true, 
                      }} 
                      sx={{
                        backgroundColor: 'transparent',
                        width: '100%',
                        margin: 0,
                        padding: 0,
                        '& .MuiInputBase-root': {
                           backgroundColor: 'transparent !important',
                           marginTop: '0',
                           padding: '0', 
                           height: 'auto', 
                           lineHeight: 'inherit',
                           border: 'none',
                           boxShadow: 'none',
                           color: 'white',
                        },
                        '& .MuiInputBase-input': {
                          backgroundColor: 'transparent !important',
                          padding: '0', 
                          fontSize: 'inherit', 
                          color: 'white',
                          fontFamily: 'inherit',
                          fontWeight: 'inherit', 
                          lineHeight: 'inherit', 
                          height: 'auto', 
                          border: 'none',
                        },
                      }}
                    />
                </Box>
            ) : (
                <span className={styles['chat-item-title']} title={visibleTopic}>
                    {displayedTitle}
                </span>
            )}
        </Box> 
    </ListItemButton>
  );
} 