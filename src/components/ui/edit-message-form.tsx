import React, { useState, useEffect } from "react";
import { TextField, Button, Box } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import Locale from "@/locales"; // Assuming Locale is accessible

interface EditMessageFormProps {
  initialText: string;
  isChatLoading: boolean;
  onConfirm: (newText: string) => void;
  onCancel: () => void;
}

export const EditMessageForm: React.FC<EditMessageFormProps> = ({
  initialText,
  isChatLoading,
  onConfirm,
  onCancel,
}) => {
  const [editedText, setEditedText] = useState(initialText);

  useEffect(() => {
    setEditedText(initialText);
  }, [initialText]);

  const handleConfirmClick = () => {
    if (editedText.trim() === initialText.trim() || editedText.trim() === "") {
      onCancel();
      return;
    }
    onConfirm(editedText);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleConfirmClick();
    }
    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <TextField
        fullWidth
        multiline
        variant="outlined"
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ marginBottom: 1 }}
        autoFocus
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onCancel}
          startIcon={<CancelIcon />}
        >
          {Locale.UI.Cancel}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleConfirmClick}
          disabled={editedText.trim() === "" || isChatLoading}
          startIcon={<SendIcon />}
        >
          {Locale.UI.Confirm}
        </Button>
      </Box>
    </Box>
  );
};
