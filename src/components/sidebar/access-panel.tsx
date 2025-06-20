import React from "react";
import styles from "./access-panel.module.scss";
import Locale from "@/locales";

interface AccessPanelProps {
  onLockServiceClick?: () => void;
}

const AccessPanel: React.FC<AccessPanelProps> = ({ onLockServiceClick }) => {
  return (
    <div className={styles.container}>
      <div className={styles.accessHeaderContainer}>
        <div className={styles.accessHeaderText}>{Locale.Sidebar.Access}</div>
      </div>
      <div
        className={styles.row}
        onClick={onLockServiceClick}
        role="button"
        tabIndex={0}
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper}>
            <img
              src="/icons/lock-icon.svg"
              alt="Lock"
              className={styles.lockIcon}
            />
          </div>
        </div>
        <div className={styles.lockServiceText}>{Locale.Sidebar.LockService}</div>
      </div>
    </div>
  );
};

export default AccessPanel;
