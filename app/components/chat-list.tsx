import DeleteIcon from "../icons/delete.svg";
import MenuIcon from "../icons/menu.svg";
import RenameIcon from "../icons/rename.svg";

import styles from "./home.module.scss";
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

import { useChatStore, ChatSession } from "../store/chat";

import Locale from "../locales";
import { useLocation, useNavigate } from "react-router-dom";
import { Path } from "../constant";
// import { MaskAvatar } from "./mask";
// import { Mask } from "../store/mask";
import { useRef, useEffect, useState } from "react";
import { showConfirm, showPrompt } from "./ui-lib";
import { useMobileScreen } from "../utils";
import clsx from "clsx";
import { createPortal } from "react-dom";

interface ChatListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
}

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: string;
  index: number;
  narrow?: boolean;
  // mask: Mask;
}) {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.title);
  
  useEffect(() => {
    if (props.selected && draggableRef.current) {
      draggableRef.current?.scrollIntoView({
        block: "center",
      });
    }
  }, [props.selected]);

  useEffect(() => {
    // Update menu position when it's shown
    if (showMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 120 + rect.width, // Align to the right
      });
    }
  }, [showMenu]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
      
      // Handle click outside for editing
      if (
        isEditing &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        handleSaveEdit();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, isEditing]);

  const { pathname: currentPath } = useLocation();
  
  const handleRename = async () => {
    setIsEditing(true);
    setEditValue(props.title);
    setShowMenu(false);
    
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };
  
  const handleDelete = async () => {
    if (props.onDelete) {
      await props.onDelete();
    }
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
      setEditValue(props.title);
    }
  };
  
  const handleSaveEdit = () => {
    if (editValue.trim() !== '' && editValue !== props.title && props.onRename) {
      props.onRename(editValue);
    }
    setIsEditing(false);
  };
  
  return (
    <Draggable draggableId={`${props.id}`} index={props.index}>
      {(provided) => (
        <div
          className={clsx(styles["chat-item"], {
            [styles["chat-item-selected"]]:
              props.selected &&
              (currentPath === Path.Chat || currentPath === Path.Home),
          })}
          onClick={props.onClick}
          ref={(ele) => {
            draggableRef.current = ele;
            provided.innerRef(ele);
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          title={`${props.title}\n${Locale.ChatItem.ChatItemCount(
            props.count,
          )}`}
        >
          {props.narrow ? (
            <div className={styles["chat-item-narrow"]}>
              <div className={clsx(styles["chat-item-avatar"], "no-dark")}>
                {/* <MaskAvatar
                  avatar={props.mask.avatar}
                  model={props.mask.modelConfig.model}
                /> */}
              </div>
              <div className={styles["chat-item-narrow-count"]}>
                {props.count}
              </div>
            </div>
          ) : (
            <>
              <div className={styles["chat-item-title"]}>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    className={styles["chat-item-title-input"]}
                    value={editValue}
                    onChange={handleEditChange}
                    onKeyDown={handleEditKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    className={styles["chat-item-title-text"]}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setTimeout(() => {
                        inputRef.current?.focus();
                        inputRef.current?.select();
                      }, 10);
                    }}
                  >
                    {props.title}
                  </span>
                )}
              </div>
              <div className={styles["chat-item-info"]}>
                <div className={styles["chat-item-count"]}>
                  {Locale.ChatItem.ChatItemCount(props.count)}
                </div>
                <div className={styles["chat-item-date"]}>{props.time}</div>
              </div>
            </>
          )}

          <div
            className={styles["chat-item-menu"]}
            ref={menuRef}
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MenuIcon />
          </div>
          
          {showMenu && createPortal(
            <div 
              className={styles["chat-item-menu-dropdown"]}
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                zIndex: 1000,
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                padding: '8px 0',
                minWidth: '120px',
              }}
            >
              <div 
                className={styles["chat-item-menu-option"]}
                onClick={handleRename}
              >
                <RenameIcon />
                <span>Rename</span>
              </div>
              <div 
                className={styles["chat-item-menu-option"]}
                onClick={handleDelete}
              >
                <DeleteIcon />
                <span>Delete</span>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </Draggable>
  );
}

export function ChatList(props: { narrow?: boolean }) {
  const sessions = useChatStore((state) => state.sessions);
  const selectedIndex = useChatStore((state) => state.currentSessionIndex);
  const selectSession = useChatStore((state) => state.selectSession);
  const moveSession = useChatStore((state) => state.moveSession);
  const deleteSession = useChatStore((state) => state.deleteSession);
  const updateTargetSession = useChatStore((state) => state.updateTargetSession);
  
  const navigate = useNavigate();
  const isMobileScreen = useMobileScreen();

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveSession(source.index, destination.index);
  };
  
  const handleRename = (session: ChatSession, newName: string) => {
    if (newName && newName.trim() !== '') {
      updateTargetSession(session, (session) => {
        session.topic = newName.trim();
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="chat-list">
        {(provided) => (
          <div
            className={styles["chat-list"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {sessions.map((item, i) => (
              <ChatItem
                title={item.topic}
                time={new Date(item.lastUpdate).toLocaleString()}
                count={item.messages.length}
                key={item.id}
                id={item.id}
                index={i}
                selected={i === selectedIndex}
                onClick={() => {
                  navigate(Path.Chat);
                  selectSession(i);
                }}
                onDelete={async () => {
                  if (
                    // (!props.narrow && !isMobileScreen) ||
                    (await showConfirm(Locale.Home.DeleteChat))
                  ) {
                    deleteSession(i);
                  }
                }}
                onRename={(newTitle) => handleRename(item, newTitle)}
                narrow={props.narrow}
                // mask={item.mask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
