import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/app/store"; // Restored import for useChatStore
import { ChatSession } from "@/app/types"; // Corrected import path for ChatSession
import Locale from "@/app/locales"; 
import { Path } from "@/app/constant"; 

import {
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Button,
  IconButton
} from "@mui/material";
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';

export function SessionConfigModel(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  if (!session) {
    return null; // Don't render if there's no session
  }

  const router = useRouter();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleReset = () => {
    chatStore.updateTargetSession(
      session,
      (session: ChatSession) => (session.memoryPrompt = ""),
    );
    setConfirmDialogOpen(false);
    props.onClose();
  };

  const handleSaveAs = () => {
    router.push(Path.Masks);
    // Note: Original timeout might be needed depending on maskStore logic
    // setTimeout(() => {
      // maskStore.create(session.mask); // Uncomment if needed
    // }, 500);
    props.onClose();
  };

  return (
    <>
      <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {Locale.Context.Edit}
          <IconButton
            aria-label="close"
            onClick={props.onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <p>Configuration options will appear here.</p>
        </DialogContent>
        <DialogActions>
          <Button
            key="reset"
            startIcon={<ReplayIcon />}
            variant="outlined"
            onClick={() => setConfirmDialogOpen(true)}
          >
            {Locale.Chat.Config.Reset}
          </Button>
          <Button
            key="copy"
            startIcon={<ContentCopyIcon />}
            variant="outlined"
            onClick={handleSaveAs}
          >
            {Locale.Chat.Config.SaveAs}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>{Locale.Memory.ResetConfirm}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>{Locale.UI.Cancel}</Button>
          <Button onClick={handleReset} color="primary" autoFocus>
            {Locale.UI.Confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 