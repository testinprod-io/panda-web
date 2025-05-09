'use client'

import React, { useState, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth"; // Assuming Privy is used here

import { useChatStore, useAccessStore } from "@/app/store"; 
import { ChatSession, EncryptedMessage } from "@/app/types"
import { safeLocalStorage, useMobileScreen } from "@/app/utils"; // Adjust path
import { useCommand } from "@/app/command"; // Adjust path
import Locale from "@/app/locales"; // Adjust path

import { ChatComponent } from "@/app/components/chat/ChatComponent"; // Import the internal component
import { EditMessageModal } from "@/app/components/chat/EditMessageModal";
import { SessionConfigModel } from "@/app/components/chat/SessionConfigModel"; // Import session config modal

// MUI Imports for Confirmation Dialog
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

import styles from "./chat.module.scss";

// State type for confirmation dialog
interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

let renderCount = 0; // Module-level counter for renders

export function Chat() {
  renderCount++;
  const chatStore = useChatStore();
  const accessStore = useAccessStore();

  const session = chatStore.currentSession(); // Get current session
  // Get the specific update action from the store
  const updateTargetSessionAction = useChatStore((state) => state.updateTargetSession);

  // Define the callback function for updating the session
  const handleUpdateSession = useCallback((updatedSession: ChatSession) => {
    // Use the selected action to update the store
    // The updater function receives the session and modifies it
    updateTargetSessionAction(updatedSession, (sess) => {
        // Since the entire updatedSession is passed, just assign its properties
        // This assumes debouncedUpdateSession passes the full session object
        // If it only passes partial updates, this logic needs adjustment.
        Object.assign(sess, updatedSession);
    });
  }, [updateTargetSessionAction]);

  // State for modals, managed by the parent component
  const [editingMessage, setEditingMessage] = useState<EncryptedMessage | undefined>(); // Store the message being edited - Type changed
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  // const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false); // For SessionConfigModel

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
  const handleShowEditMessageModal = useCallback((message: EncryptedMessage) => { // Type changed
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
  if (!session) {
    // This should ideally not be reached if page.tsx redirects correctly
    // but keep a fallback loading state just in case.
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
         <p>Loading session...</p> {/* Or a spinner */}
       </div>
    );
  }

  console.log(`[Chat] Render #${renderCount}: Rendering <ChatComponent /> with key=${session.id}`);
  return (
    <div className={styles.chat}>
      <div className={styles["window-content"]} id="chat-container">
        {/* Main Chat Area */} 
        <ChatComponent
          key={session.id} 
          sessionId={session.id}
          onUpdateSession={handleUpdateSession}
          onShowConfirmDialog={showConfirmationDialog}
          onShowEditMessageModal={handleShowEditMessageModal}
          onShowPromptModal={handleShowPromptModal} 
          setShowPromptModal={setShowPromptModal}
          setShowShortcutKeyModal={handleShowShortcutKeyModal}
        />

        {showPromptModal && (
          <SessionConfigModel onClose={() => setShowPromptModal(false)} />
        )}

        {showEditMessageModal && editingMessage && ( 
          <EditMessageModal 
            onClose={() => {
              setShowEditMessageModal(false);
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