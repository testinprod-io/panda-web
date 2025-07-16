import React from "react";
import { Typography } from "@mui/material";
import { LoadedFile } from "@/hooks/use-loaded-files";
import styles from "@/components/chat/chat.module.scss";
import clsx from "clsx";
import { FileCircularProgress } from "./file-circular-progress";
import { ActionButton } from "./action-button";
import CloseIcon from "@mui/icons-material/Close";

interface FilePreviewItemProps {
  file: LoadedFile;
  onRemove?: (file: LoadedFile) => void;
}

export const FilePreviewItem: React.FC<FilePreviewItemProps> = ({
  file,
  onRemove,
}) => {
  const isImage = file.type.startsWith("image");
  const fileTypeDisplay =
    file.type.split("/")[1]?.toUpperCase() || "File";

  if (file.isLoading) {
    return (
      <div
        key={`${file.id}-loading-preview`}
        className={clsx(
          styles["attach-file-item"],
          isImage
            ? styles["attach-file-item-image"]
            : styles["attach-file-item-doc"],
        )}
        style={
          isImage && file.url
            ? { backgroundImage: `url(${file.url})` }
            : {}
        }
      >
        <div className={styles["file-status-overlay"]}>
          <FileCircularProgress progress={0} />
        </div>
      </div>
    );
  }

  if (file.error) {
    return (
      <div
        key={`${file.id}-error-preview`}
        className={clsx(
          styles["attach-file-item"],
          styles["attach-file-item-doc"],
        )}
      >
        <div className={styles["file-status-overlay"]}>
          <Typography variant="caption" color="error" sx={{ padding: "4px" }}>
            Error: {file.error}
          </Typography>
        </div>
        <div className={styles["doc-file-icon-bg"]} style={{ backgroundColor: "#F33D4F" }}>
          <img src="/icons/file.svg" alt="Error" style={{ width: "21px", height: "26px" }} />
        </div>
        <div className={styles["doc-file-info"]}>
          <div className={styles["doc-file-name"]} style={{ color: "#F33D4F" }}>
            {file.name || "File error"}
          </div>
          <div className={styles["doc-file-type"]}>Error</div>
        </div>
        {onRemove && (
          <button
            className={styles["doc-file-delete-button"]}
            onClick={() => onRemove(file)}
            aria-label="Remove errored file"
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    );
  }

  const commonDivProps = {
    className: clsx(
      styles["attach-file-item"],
      isImage
        ? styles["attach-file-item-image"]
        : styles["attach-file-item-doc"],
    ),
    style: isImage ? { backgroundImage: `url(${file.url})` } : {},
  };

  return (
    <div {...commonDivProps}>
      {isImage ? (
        <div className={styles["attach-file-mask-image"]}>
          {onRemove && (
            <ActionButton
              icon={
                <img
                  src="/icons/delete.svg"
                  className={styles.deleteAttachmentIcon}
                  alt="Delete attached image"
                />
              }
              onClick={() => onRemove(file)}
              className={styles.deleteImageActionButton}
              ariaLabel="Delete attached image"
              title="Delete image"
            />
          )}
        </div>
      ) : (
        <>
          <div className={styles["doc-file-icon-bg"]}>
            <img src="/icons/file.svg" alt="File" style={{ width: "21px", height: "26px" }} />
          </div>
          <div className={styles["doc-file-info"]}>
            <div className={styles["doc-file-name"]}>{file.name}</div>
            <div className={styles["doc-file-type"]}>{fileTypeDisplay}</div>
          </div>
          {onRemove && (
            <button
              className={styles["doc-file-delete-button"]}
              onClick={() => onRemove(file)}
              aria-label="Remove file"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </button>
          )}
        </>
      )}
    </div>
  );
};
