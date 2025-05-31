import React from 'react';
import styles from './chat.module.scss'; // Assuming styles are needed and path is correct relative to this new component

interface FileCircularProgressProps {
  progress: number; // Value from 0 to 100
}

export const FileCircularProgress: React.FC<FileCircularProgressProps> = ({ progress }) => {
  const normalizedProgress = Math.max(0, Math.min(100, progress)); // Ensure 0-100

  return (
    <svg viewBox="0 0 36 36" className={styles.circularProgressSvg}>
      <path
        className={styles.circularProgressTrack} // Use class for track
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        // stroke property will come from SCSS class
        strokeWidth="2.5"
      />
      <path
        className={styles.circularProgressValue} // Use class for value
        strokeDasharray="100"
        style={{
          strokeDashoffset: 100 * (1 - normalizedProgress / 100),
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
        }}
        // stroke property will come from SCSS class
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};