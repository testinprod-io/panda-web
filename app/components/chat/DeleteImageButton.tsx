import React from "react";
import styles from "./chat.module.scss"; 
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'; // Use MUI Icon
import IconButton from '@mui/material/IconButton'; // Use MUI IconButton for better semantics

export function DeleteImageButton(props: { deleteImage: () => void }) {
  return (
    <IconButton 
      size="small"
      className={styles["delete-image"]} // Apply custom styles if needed
      onClick={props.deleteImage}
      aria-label="Delete attached image"
    >
      <DeleteOutlineIcon fontSize="inherit"/> {/* Use MUI Icon */}
    </IconButton>
  );
} 