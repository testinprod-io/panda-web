import React from "react";
import styles from "./access-panel.module.scss";
import Locale from "@/locales";
import LockIcon from "@/public/icons/lock-icon.svg";

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
            <LockIcon className={styles.lockIcon} />
          </div>
        </div>
        <div className={styles.lockServiceText}>
          {Locale.Sidebar.LockService}
        </div>
      </div>
    </div>
  );
};

export default AccessPanel;
