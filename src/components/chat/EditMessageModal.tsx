import React, { useState } from "react";
import { useChatStore } from "@/store"; 
import { ChatSession } from "@/types";
import Locale from "@/locales"; ; 
import { 
  IconButton, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  List, 
  ListItem, 
  ListItemText 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; 
import CheckIcon from '@mui/icons-material/Check'; 

export function EditMessageModal(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  
  if (!session) {
    return null; 
  }

  const [editedTopic, setEditedTopic] = useState(session.topic);
  
  return (
      <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="xs"> {/* Changed Modal to Dialog */}
        <DialogTitle>{Locale.Chat.EditMessage.Title}</DialogTitle> {/* Added DialogTitle */}
        <DialogContent> {/* Added DialogContent */}
          <List>
            <ListItem> {/* Kept ListItem, now from MUI */}
              {/* Used ListItemText for title/subtitle */}
              <ListItemText 
                primary={Locale.Chat.EditMessage.Topic.Title} 
                secondary={Locale.Chat.EditMessage.Topic.SubTitle} 
              />
              <TextField
                fullWidth
                value={editedTopic}
                onChange={(e) => setEditedTopic(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }} // Added some margin for spacing
              />
            </ListItem>
            {/* Add fields here if individual message editing is required */}
          </List>
        </DialogContent>
        <DialogActions> {/* Added DialogActions */}
          <IconButton
            key="cancel"
            onClick={props.onClose} // Simplified onClick
            aria-label={Locale.UI.Cancel}
          >
            <CloseIcon /> {/* Changed to MUI Icon */}
          </IconButton>
          <IconButton
            key="ok"
            onClick={() => {
              chatStore.updateTargetSession(
                session,
                (session: ChatSession) => (session.topic = editedTopic),
              );
              props.onClose();
            }}
            color="primary"
            aria-label={Locale.UI.Confirm}
          >
            <CheckIcon /> {/* Changed to MUI Icon */}
          </IconButton>
        </DialogActions>
      </Dialog>
    // Removed: </div>
  );
} 