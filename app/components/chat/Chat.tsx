'use client'

import React, { useState, useCallback, useEffect } from "react";
import { EncryptedMessage } from "@/app/types";
import Locale from "@/app/locales";
import { useChatStore } from "@/app/store"; // Import useChatStore

import { MemoizedChatComponent } from "@/app/components/chat/ChatComponent";
import { EditMessageModal } from "@/app/components/chat/EditMessageModal";
import { SessionConfigModel } from "@/app/components/chat/SessionConfigModel";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import { UUID } from "crypto";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

interface ChatContainerProps { 
  _sessionId: UUID;
  // Modal related props passed from ChatPage or managed here and registered with store
  _showEditMessageModalProp?: (message: EncryptedMessage) => void; // Optional from parent
  _editingMessageProp?: EncryptedMessage;
  _setShowEditMessageModalStateProp?: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Add props for prompt modal state, passed from ChatPage
  _showPromptModalStateProp: boolean;
  _setShowPromptModalStateProp: React.Dispatch<React.SetStateAction<boolean>>;
  // Add props for shortcut key modal if it's also managed by ChatPage
  // _showShortcutKeyModalStateProp: boolean;
  // _setShowShortcutKeyModalStateProp: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Chat(props: ChatContainerProps) { 
  const {
    _sessionId,
    _showEditMessageModalProp,
    _editingMessageProp,
    _setShowEditMessageModalStateProp,
    _showPromptModalStateProp,     // Destructure new prop
    _setShowPromptModalStateProp,  // Destructure new prop
  } = props;

  const chatStore = useChatStore();
  const {
    setShowPromptModalHandler, 
    setShowShortcutKeyModalHandler,
    clearChatInteractionHandlers, // To clear modal handlers on unmount
  } = chatStore;

  // Internal state for modals if not fully controlled by parent
  const [showEditModal, setShowEditModal] = useState(!!_editingMessageProp);
  const [editingMessage, setEditingMessage] = useState<EncryptedMessage | undefined>(_editingMessageProp);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false); // Assuming this is a feature

  // Update internal state if props change (for edit modal)
  useEffect(() => {
    setShowEditModal(!!_editingMessageProp);
    setEditingMessage(_editingMessageProp);
  }, [_editingMessageProp]);

  const handleShowEditMessage = (message: EncryptedMessage) => {
    if (_showEditMessageModalProp && _setShowEditMessageModalStateProp) {
      _showEditMessageModalProp(message); // Call parent's handler if provided
    } else {
      setEditingMessage(message);
      setShowEditModal(true);
    }
  };

  const handleCloseEditMessage = () => {
    if (_setShowEditMessageModalStateProp) {
      _setShowEditMessageModalStateProp(false);
    } else {
      setShowEditModal(false);
    }
    setEditingMessage(undefined); // Always clear local editing message
  };

  const handleShowPromptModal = () => setShowPromptModal(true);
  const handleShowShortcutKeyModal = () => setShowShortcutKeyModal(true);

  // Register modal handlers with the store for ChatInputPanel (via RootChatGroupLayout)
  useEffect(() => {
    setShowPromptModalHandler(handleShowPromptModal);
    setShowShortcutKeyModalHandler(handleShowShortcutKeyModal);
    return () => {
      // Clear these specific handlers when Chat.tsx unmounts or _sessionId changes,
      // RootChatGroupLayout also clears all handlers on its own session change.
      setShowPromptModalHandler(null);
      setShowShortcutKeyModalHandler(null);
    };
  }, [setShowPromptModalHandler, setShowShortcutKeyModalHandler, _sessionId]);
  
  const [confirmDialogState, setConfirmDialogState] = useState<ConfirmDialogState>({
    open: false, title: "", content: "", onConfirm: () => {},
  });
  const showConfirmationDialog = useCallback((title: string, content: string, onConfirm: () => void) => {
    setConfirmDialogState({ open: true, title, content, onConfirm });
  }, []);
  const closeConfirmationDialog = useCallback(() => setConfirmDialogState(prev => ({ ...prev, open: false })), []);
  const handleConfirmation = useCallback(() => {
    confirmDialogState.onConfirm();
    closeConfirmationDialog();
  }, [confirmDialogState, closeConfirmationDialog]);

  if (!_sessionId) {
    return null; 
  }

  return (
    <>
      <MemoizedChatComponent
        key={_sessionId} 
        sessionId={_sessionId}
        // Pass modal triggers that ChatMessageCell might need
        onShowEditMessageModal={handleShowEditMessage}
        onShowConfirmDialog={showConfirmationDialog}
        onShowPromptModalRequest={handleShowPromptModal} // If ChatComponent internally needs to trigger this
        onShowShortcutKeyModalRequest={handleShowShortcutKeyModal} // If ChatComponent internally needs to trigger this
      />

      {_showPromptModalStateProp && (
        <SessionConfigModel onClose={() => _setShowPromptModalStateProp(false)} />
      )}

      {showEditModal && editingMessage && (
        <EditMessageModal onClose={handleCloseEditMessage} />
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
    </>
  );
} 