import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

import styles from "./chat-list.module.scss";
// import { ChatSession } from "@/app/store/chat"; // Type likely comes from types/session
import type { ChatSession } from "@/app/types/session"; // Adjusted path

import DeleteOutline from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';

interface ChatItemProps {
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  session: ChatSession; // Pass the whole session object
  selected: boolean;
  index: number;
  narrow?: boolean;
}

export function ChatItem(props: ChatItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.session.topic);

  // Update edit value if the session topic changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(props.session.topic);
    }
  }, [props.session.topic, isEditing]);

  // Scroll into view when selected
  useEffect(() => {
    if (props.selected && itemRef.current) {
      itemRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [props.selected]);

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
    setEditValue(props.session.topic);
    setShowMenu(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    props.onDelete?.();
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
      setEditValue(props.session.topic);
    }
  };

  const handleSaveEdit = () => {
    if (
      editValue.trim() !== '' &&
      editValue !== props.session.topic &&
      props.onRename
    ) {
      props.onRename(editValue.trim());
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

  return (
    <div
      className={clsx(styles["chat-item"], {
        [styles["chat-item-selected"]]: props.selected,
      })}
      onClick={props.onClick}
      ref={itemRef}
      title={props.session.topic}
    >
      <div className={styles["chat-item-title"]}>
        {isEditing ? (
          <input
            ref={inputRef}
            className={styles["chat-item-title-input"]}
            value={editValue}
            onChange={handleEditChange}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit} // Save on blur as well
            onClick={(e) => e.stopPropagation()} // Prevent click propagation to the item
          />
        ) : (
          <span className={styles["chat-item-title-text"]}>
            {props.session.topic}
          </span>
        )}
      </div>

      {!isEditing && ( // Only show menu when not editing and on client
        <div
          className={styles["chat-item-menu"]}
          ref={menuRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreVertIcon fontSize="small" />
        </div>
      )}

      {showMenu && // Only show portal on client
        createPortal(
          <div
            className={styles["chat-item-menu-dropdown"]}
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 1000,
            }}
          >
            <div
              className={styles["chat-item-menu-option"]}
              onClick={handleRename}
            >
              <DriveFileRenameOutlineIcon sx={{ mr: 1, fontSize: '1rem' }} />
              <span>Rename</span>
            </div>
            <div
              className={styles["chat-item-menu-option"]}
              onClick={handleDelete}
            >
              <DeleteOutline sx={{ mr: 1, fontSize: '1rem' }} />
              <span>Delete</span>
            </div>
          </div>,
          document.body // Ensure portal mounts to body
        )}
    </div>
  );
} 