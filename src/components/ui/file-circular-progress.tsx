import React from "react";
import styles from "@/components/chat/chat.module.scss";

interface FileCircularProgressProps {
  progress: number;
}

export const FileCircularProgress: React.FC<FileCircularProgressProps> = ({
  progress,
}) => {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  return (
    <svg viewBox="0 0 36 36" className={styles.circularProgressSvg}>
      <path
        className={styles.circularProgressTrack}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        strokeWidth="2.5"
      />
      <path
        className={styles.circularProgressValue}
        strokeDasharray="100"
        style={{
          strokeDashoffset: 100 * (1 - normalizedProgress / 100),
          transform: "rotate(-90deg)",
          transformOrigin: "center",
        }}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
