import React from 'react';
import Image from 'next/image';
import { Box, Typography, CircularProgress } from '@mui/material';
import { LoadedFile } from '@/hooks/use-loaded-files';
import { GenericFileIcon } from '../../common/GenericFileIcon'; // Assuming path from src/components/chat/
import styles from './chat.module.scss'; // Reusing chat styles
import clsx from 'clsx';

interface FilePreviewItemProps {
  file: LoadedFile;
}

export const FilePreviewItem: React.FC<FilePreviewItemProps> = ({ file }) => {
  if (file.isLoading) {
    return (
      <Box 
        key={`${file.id}-loading`}
        className={styles["chat-message-item-loading"]} // Ensure this class exists and is styled
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        style={{
          borderRadius: "8px",
          outline: "1px solid #CACACA", // Consider theme variables
          backgroundColor: "#F0F0F0",    // Consider theme variables
          // objectFit: "cover", // Not directly applicable to Box, but for image inside if any
          width: "160px", // Consistent preview item size
          height: "160px",// Consistent preview item size
        }}
      >
        <CircularProgress size={24} color="inherit"/>
      </Box>
    );
  }

  if (file.error) {
    return (
      <Box 
        key={`${file.id}-error`}
        className={styles["chat-message-file-item-error"]} // Ensure this class exists
        sx={{
          display: "flex",
          flexDirection: "column", // Align icon and text vertically
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #F33D4F", // Error color, consider theme variable
          backgroundColor: "#FFF4F4", // Light error background, consider theme variable
          width: "160px",
          height: "160px",
          gap: "8px",
        }}
      >
        <GenericFileIcon /> {/* Or a specific error icon like ReportProblemIcon */}
        <Typography variant="caption" color="error" sx={{ wordBreak: 'break-word' }}>
          {file.name}<br/>({file.error})
        </Typography>
      </Box>
    );
  }

  // Common anchor tag props
  const anchorProps = {
    href: file.url,
    download: file.name,
    target: "_blank",
    rel: "noopener noreferrer",
    style: { textDecoration: 'none', display: 'block' }, // display:block helps anchor fill Box
  };

  if (file.type.startsWith("image")) {
    return (
      <a key={`${file.id}-anchor`} {...anchorProps}>
        <Image
          className={clsx(styles["chat-message-item-image-outside"], styles.attachedFileImagePreview)} // Use existing classes
          src={file.url}
          alt={file.name || `attached image ${file.id}`}
          width={160} 
          height={160}
          // Styles are now in .attachedFileImagePreview
        />
      </a>
    );
  }

  if (file.type.startsWith("application/pdf") || file.type.startsWith("pdf")) {
    return (
      <a key={`${file.id}-anchor`} {...anchorProps}>
        <Box
          className={styles["chat-message-file-item-doc"]} // Generic doc item style
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: "#f0f0f0", // Consider theme variables
            border: "1px solid #e0e0e0", // Consider theme variables
            width: "160px", // Fixed width for consistency in a grid
            height: "auto", // Auto height based on content
            minHeight: "60px", // Ensure a minimum height
            cursor: "pointer",
          }}
        >
          <GenericFileIcon />
          <Box sx={{ overflow: "hidden", flexGrow: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis",
                fontWeight: 500,
              }}
            >
              {file.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              PDF Document {file.originalType ? `(${file.originalType})` : ""}
            </Typography>
          </Box>
        </Box>
      </a>
    );
  }

  // Fallback for 'other' file types
  return (
    <a key={`${file.id}-anchor`} {...anchorProps}>
      <Box
        className={styles["chat-message-file-item-doc"]} // Re-use generic doc item style
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: "#f0f0f0", // Consider theme variables
          border: "1px solid #e0e0e0", // Consider theme variables
          width: "160px", // Fixed width
          height: "auto", // Auto height
          minHeight: "60px",
          cursor: "pointer",
        }}
      >
        <GenericFileIcon />
        <Box sx={{ overflow: "hidden", flexGrow: 1 }}>
          <Typography 
            variant="body2"
            sx={{ 
              whiteSpace: "nowrap", 
              overflow: "hidden", 
              textOverflow: "ellipsis",
              fontWeight: 500,
            }}
          >
            {file.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {file.originalType || "File"}
          </Typography>
        </Box>
      </Box>
    </a>
  );
};