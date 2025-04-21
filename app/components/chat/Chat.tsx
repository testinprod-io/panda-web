'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth"; // Assuming Privy is used here

import { useChatStore, useAccessStore } from "@/app/store"; // Adjust path, Import AccessControlStore type
import { ChatSession, ChatMessage } from "@/app/types"
import { useAppConfig } from "@/app/store"; // Adjust path
import { Path, UNFINISHED_INPUT } from "@/app/constant"; // Adjust path
import { safeLocalStorage, useMobileScreen } from "@/app/utils"; // Adjust path
import { useCommand } from "@/app/command"; // Adjust path
import Locale from "@/app/locales"; // Adjust path

import { ChatComponent } from "@/app/components/chat/ChatComponent"; // Import the internal component
import { EditMessageModal } from "@/app/components/chat/EditMessageModal";
// import { ShortcutKeyModal } from "./ShortcutKeyModal";
import { SessionConfigModel } from "@/app/components/chat/SessionConfigModel"; // Import session config modal

// MUI Imports for Confirmation Dialog
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

import styles from "./chat.module.scss";
import clsx from "clsx";

const localStorage = safeLocalStorage();

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
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { getAccessToken } = usePrivy(); // Uncomment if needed

  const sessionId = params?.sessionId as string | undefined;
  const isMobileScreen = useMobileScreen();
  const session = chatStore.currentSession(); // Get current session
  console.log(`[Chat] Render #${renderCount}: Received session.id=${session?.id}, isLoading=${!session}`);

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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | undefined>(); // Store the message being edited
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
  const handleShowEditMessageModal = useCallback((message: ChatMessage) => {
      setEditingMessage(message);
      setShowEditMessageModal(true);
  }, []);

  // Handle Commands (like URL parameters)
  useCommand({
    // Example: fill input based on URL parameter (if needed)
    // fill: (text) => {
    //   // This might need to be passed down to ChatComponentInternal or handled via state
    // },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      console.log("[Command] got code from url: ", text);
      showConfirmationDialog(
        Locale.URLCommand.Code,
        `code = ${text}`,
        () => {
          // accessStore.update((access: AccessControlStore) => (access.accessCode = text));
        }
      );
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;
      try {
        const payload = JSON.parse(text) as { key?: string; url?: string };
        console.log("[Command] got settings from url: ", payload);
        if (payload.key || payload.url) {
          showConfirmationDialog(
            Locale.URLCommand.Settings,
            `${JSON.stringify(payload, null, 4)}`,
            () => {
              // accessStore.update((access: AccessControlStore) => {
              //   if (payload.key) access.openaiApiKey = payload.key!;
              //   if (payload.url) access.openaiUrl = payload.url!;
              //   access.useCustomConfig = true;
              // });
            }
          );
        }
      } catch (e) {
        console.error("[Command] failed to parse settings from url: ", text, e);
      }
    },
  });

  // Select only the newSession action for the keydown effect
  const newSessionAction = useChatStore((state) => state.newSession);

  // Handle Global Keyboard Shortcuts (related to session management)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        newSessionAction(); // Use the selected action
        router.push(Path.Chat); // Go to base chat path, will redirect to new session ID
      }
      // Add other global shortcuts if needed (e.g., switching sessions)
      // Consider moving shortcuts specific to chat interaction (copy, clear) to ChatComponentInternal
      // Show Shortcut Key Modal
      else if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        // setShowShortcutKeyModal(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    // Only depends on router and the specific chatStore action
  }, [router, newSessionAction]);

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
          key={session.id} // Ensure re-render on session change
          session={session} // Pass the current session object
          onUpdateSession={handleUpdateSession} // Pass the update callback
          onShowConfirmDialog={showConfirmationDialog} // Pass confirmation dialog handler
          onShowEditMessageModal={handleShowEditMessageModal} // Pass edit modal handler
          onShowPromptModal={() => setShowPromptModal(true)} // Pass prompt modal handler
          setShowPromptModal={setShowPromptModal}
          setShowShortcutKeyModal={() => {}}
        />

        {/* Modals Rendered at the Top Level */} 
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

        {/* {showShortcutKeyModal && (
          <ShortcutKeyModal onClose={() => setShowShortcutKeyModal(false)} />
        )} */}

        {/* Confirmation Dialog */} 
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

        {/* Side Panel Placeholder - Logic would go here if needed */}
        {/* <div className={clsx(styles["chat-side-panel"], { [styles["mobile"]]: isMobileScreen })}> */}
        {/*   Side Panel Content */}
        {/* </div> */}
      </div>
    </div>
  );
} 