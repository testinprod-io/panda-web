'use client'

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth"; // Assuming Privy is used here

import { useChatStore, useAccessStore } from "@/app/store"; 
import { ChatSession, EncryptedMessage } from "@/app/types"
import { safeLocalStorage, useMobileScreen } from "@/app/utils"; // Adjust path
import { useCommand } from "@/app/command"; // Adjust path
import Locale from "@/app/locales"; // Adjust path

import { MemoizedChatComponent } from "@/app/components/chat/ChatComponent";
import type { ChatComponentProps } from "@/app/components/chat/ChatComponent"; // Import the props type
import { EditMessageModal } from "@/app/components/chat/EditMessageModal";
import { SessionConfigModel } from "@/app/components/chat/SessionConfigModel"; // Import session config modal
import { ChatLayout } from "./ChatLayout"; // Import ChatLayout

// MUI Imports for Confirmation Dialog
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import { UUID } from "crypto";

import styles from "./chat.module.scss";

// State type for confirmation dialog
interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

let renderCount = 0; // Module-level counter for renders

interface ChatContainerProps { // Renamed from ChatProps to avoid conflict if Chat is a common name
  _sessionId: UUID;
  _setIsLoadingLayout: (isLoading: boolean) => void;
  _exportSubmitHandler: (handler: (input: string, images: string[]) => Promise<void>) => void;
  _onHitBottomChange: (isAtBottom: boolean) => void;
  _exportScrollToBottomFunc: (func: () => void) => void;
  
  _handleShowEditMessageModal: (message: EncryptedMessage) => void; // Changed from _showEditMessageModalFunctionCall
  _editingMessage?: EncryptedMessage;
  _setShowEditMessageModalState: React.Dispatch<React.SetStateAction<boolean>>;
  _showPromptModalState: boolean;
  _setShowPromptModalState: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Chat(props: ChatContainerProps) { // Renamed component, ensure export name is updated if needed elsewhere
  const {
    _sessionId,
    _setIsLoadingLayout,
    _exportSubmitHandler,
    _onHitBottomChange,
    _exportScrollToBottomFunc,
    _handleShowEditMessageModal, // Changed from _showEditMessageModalFunctionCall
    _editingMessage,
    _setShowEditMessageModalState,
    _showPromptModalState,
    _setShowPromptModalState,
  } = props;

  renderCount++;
  const chatStore = useChatStore();
  const accessStore = useAccessStore();

  const session = chatStore.currentSession(); // Get current session
  // Get the specific update action from the store
  const updateTargetSessionAction = useChatStore((state) => state.updateTargetSession);

  // State managed by Chat.tsx to be provided to ChatLayout
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [hitBottom, setHitBottom] = useState(true);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<EncryptedMessage | undefined>();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false); // Assuming this is still a feature

  const submitHandlerRef = useRef<((input: string, images: string[]) => Promise<void>) | null>(null);
  const scrollToBottomFuncRef = useRef<(() => void) | null>(null);

  // Callbacks for ChatComponent to register its functions
  const exportSubmitHandler = useCallback((handler: (input: string, images: string[]) => Promise<void>) => {
    submitHandlerRef.current = handler;
  }, []);

  const handleHitBottomChange = useCallback((isAtBottom: boolean) => {
    setHitBottom(isAtBottom);
  }, []);

  const exportScrollToBottomFunc = useCallback((func: () => void) => {
    scrollToBottomFuncRef.current = func;
  }, []);

  // Callbacks for ChatLayout
  const onSendMessageToLayout = useCallback(async (input: string, images: string[]) => {
    if (submitHandlerRef.current) {
      await submitHandlerRef.current(input, images);
    } else {
      console.warn("[Chat.tsx] Submit handler not registered by ChatComponent.");
    }
  }, []);

  const scrollToBottomForLayout = useCallback(() => {
    if (scrollToBottomFuncRef.current) {
      scrollToBottomFuncRef.current();
    }
  }, []);

  // State for Confirmation Dialog
  const [confirmDialogState, setConfirmDialogState] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    content: "",
    onConfirm: () => {},
  });

  // Function to show confirmation dialog
  const showConfirmationDialog = useCallback((title: string, content: string, onConfirm: () => void) => {
    setConfirmDialogState({ open: true, title, content, onConfirm });
  }, []);

  // Function to close confirmation dialog
  const closeConfirmationDialog = useCallback(() => {
    setConfirmDialogState(prev => ({ ...prev, open: false }));
  }, []);

  // Function to handle confirmation
  const handleConfirmation = useCallback(() => {
    confirmDialogState.onConfirm();
    closeConfirmationDialog();
  }, [confirmDialogState, closeConfirmationDialog]);

  // Handler to open the edit message modal
  const handleShowEditMessageModal = useCallback((message: EncryptedMessage) => {
    setEditingMessage(message);
    setShowEditMessageModal(true);
  }, []);

  // Callback for showing prompt modal, memoized
  const handleShowPromptModal = useCallback(() => {
    setShowPromptModal(true);
  }, []);

  // Callback for showing shortcut key modal (currently no-op), memoized
  const handleShowShortcutKeyModal = useCallback(() => {
    // setShowShortcutKeyModal(true); // Or whatever it's supposed to do
  }, []);

  // If no session is found (page.tsx should handle redirecting before this renders)
  if (!_sessionId) {
    // This should ideally not be reached if page.tsx redirects correctly
    // but keep a fallback loading state just in case.
    console.warn("[Chat.tsx] Rendered without _sessionId.");
    return null; // Or some fallback UI
  }

  console.log(`[Chat] Render #${renderCount}: Rendering <ChatComponent /> with key=${_sessionId}`);

  // Prepare props for MemoizedChatComponent, ensuring types match ChatComponentProps
  const chatComponentProps: ChatComponentProps = {
      sessionId: _sessionId,
      setIsLoadingLayout: _setIsLoadingLayout,
      exportSubmitHandler: _exportSubmitHandler,
      onHitBottomChange: _onHitBottomChange,
      exportScrollToBottomFunc: _exportScrollToBottomFunc,
      // These are not part of ChatComponentProps anymore as ChatComponent doesn't directly manage these modals' visibility
      // onShowConfirmDialog: showConfirmationDialog, 
      // onShowEditMessageModal: _showEditMessageModalFunctionCall, 
  };

  return (
    <div className={styles.chat}>
      <div className={styles["window-content"]} id="chat-container">
        {/* Main Chat Area */} 
        <MemoizedChatComponent {...chatComponentProps} />

        {_showPromptModalState && _sessionId && (
          <SessionConfigModel onClose={() => _setShowPromptModalState(false)} />
        )}

        {_setShowEditMessageModalState && _editingMessage && ( 
          <EditMessageModal 
            onClose={() => {
              _setShowEditMessageModalState(false);
              setEditingMessage(undefined);
            }}
          />
        )}

        <Dialog
          open={confirmDialogState.open}
          onClose={closeConfirmationDialog}
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <DialogTitle id="confirm-dialog-title">{confirmDialogState.title}</DialogTitle>
          <DialogContent>
            <DialogContentText id="confirm-dialog-description">
              {confirmDialogState.content}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeConfirmationDialog}>{Locale.UI.Cancel}</Button>
            <Button onClick={handleConfirmation} color="primary" autoFocus>
              {Locale.UI.Confirm}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
} 