'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth"; // Assuming Privy is used here

import { useChatStore, useAccessStore } from "@/app/store"; // Adjust path, Import AccessControlStore type
import { ChatSession } from "@/app/types"
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

export function Chat() {
  const chatStore = useChatStore();
  const accessStore = useAccessStore();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { getAccessToken } = usePrivy(); // Uncomment if needed

  const sessionId = params?.sessionId as string | undefined;
  const isMobileScreen = useMobileScreen();
  const session = chatStore.currentSession(); // Get current session

  // State for modals, managed by the parent component
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

  const hasHandledSession = useRef(false); // Track initial session handling

  // Handle session selection and redirection logic
  useEffect(() => {
    // Only run redirection logic if sessionId or pathname changes
    if (sessionId) {
      const sessions = chatStore.sessions;
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex >= 0) {
        // Session found, select it if not already selected
        if (chatStore.currentSessionIndex !== sessionIndex) {
          chatStore.selectSession(sessionIndex);
        }
        hasHandledSession.current = true; // Mark as handled
      } else {
        // Session ID in URL is invalid, redirect to default chat or new chat
        console.warn(`[Chat] Session ID ${sessionId} not found, redirecting.`);
        const latestSessionId = chatStore.sessions[0]?.id;
        if (latestSessionId) {
          router.replace(`/chat/${latestSessionId}`);
        } else {
          router.replace(Path.NewChat);
        }
      }
    } else if (pathname === Path.Chat && !hasHandledSession.current) {
      // On static /chat route, redirect to the latest session or new chat
      const latestSessionId = chatStore.sessions[0]?.id;
      if (latestSessionId) {
        router.replace(`/chat/${latestSessionId}`);
      } else {
        router.replace(Path.NewChat);
      }
    }
    // We don't include chatStore in dependency array to avoid loops on store updates
    // We rely on sessionId and pathname
  }, [sessionId, pathname, router]); // Removed chatStore

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

  // Handle Global Keyboard Shortcuts (related to session management)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        chatStore.newSession();
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
    // Only depends on router and chatStore actions, not session details
  }, [router, chatStore]);

  // If no session is found (e.g., during initial load or after deletion), show loading or redirect
  if (!session) {
    // You might want a loading indicator here
    // Or ensure the useEffect redirect handles this case quickly
    return <div>Loading session...</div>; // Placeholder
  }

  return (
    <div className={styles.chat}>
      <div className={styles["window-content"]} id="chat-container">
        {/* Main Chat Area */} 
        <ChatComponent
          key={session.id} // Ensure re-render on session change
          setShowPromptModal={setShowPromptModal}
          setShowShortcutKeyModal={() => {}}
        />

        {/* Modals Rendered at the Top Level */} 
        {showPromptModal && (
          <SessionConfigModel onClose={() => setShowPromptModal(false)} />
        )}

        {showEditMessageModal && ( // This modal might need to be triggered from ChatComponent
          <EditMessageModal onClose={() => setShowEditMessageModal(false)} />
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