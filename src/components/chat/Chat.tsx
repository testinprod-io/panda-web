"use client";

import React, { useState, useCallback, useEffect } from "react";
import { EncryptedMessage } from "@/types";
import Locale from "@/locales";
import { useChatStore } from "@/store"; // Import useChatStore

import { MemoizedChatComponent } from "@/components/chat/ChatComponent";
import { EditMessageModal } from "@/components/chat/EditMessageModal";
import { SessionConfigModel } from "@/components/chat/SessionConfigModel";

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
  _setShowEditMessageModalStateProp?: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

export function Chat(props: ChatContainerProps) {
  const {
    _sessionId,
    _showEditMessageModalProp,
    _editingMessageProp,
    _setShowEditMessageModalStateProp,
  } = props;

  const chatStore = useChatStore();
  const {
    setShowPromptModalHandler,
    setShowShortcutKeyModalHandler,
  } = chatStore;

  // Internal state for modals if not fully controlled by parent
  const [showEditModal, setShowEditModal] = useState(!!_editingMessageProp);
  const [editingMessage, setEditingMessage] = useState<
    EncryptedMessage | undefined
  >(_editingMessageProp);
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

  const [confirmDialogState, setConfirmDialogState] =
    useState<ConfirmDialogState>({
      open: false,
      title: "",
      content: "",
      onConfirm: () => {},
    });
  const showConfirmationDialog = useCallback(
    (title: string, content: string, onConfirm: () => void) => {
      setConfirmDialogState({ open: true, title, content, onConfirm });
    },
    []
  );
  const closeConfirmationDialog = useCallback(
    () => setConfirmDialogState((prev) => ({ ...prev, open: false })),
    []
  );
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
      />

      {showEditModal && editingMessage && (
        <EditMessageModal onClose={handleCloseEditMessage} />
      )}

      <Dialog
        open={confirmDialogState.open}
        onClose={closeConfirmationDialog}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          {confirmDialogState.title}
        </DialogTitle>
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
