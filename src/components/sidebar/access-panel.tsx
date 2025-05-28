import React from 'react';
import styles from './access-panel.module.scss';

interface AccessPanelProps {
  onLockServiceClick?: () => void;
}

const AccessPanel: React.FC<AccessPanelProps> = ({ onLockServiceClick }) => {
  return (
    <div className={styles.container}>
      <div className={styles.accessHeaderContainer}>
        <div className={styles.accessHeaderText}>Access</div>
      </div>
      <div 
        className={styles.row} 
        onClick={onLockServiceClick}
        role="button"
        tabIndex={0}
      >
        <div className={styles.iconContainer}>
          <div className={styles.iconWrapper} data-size="20">
            <img src="/icons/lock-icon.svg" alt="Lock" className={styles.lockIcon} />
            {/* <div className={styles.lockIconOutline} /> */}
          </div>
        </div>
        <div className={styles.lockServiceText}>Lock Panda</div>
      </div>
    </div>
  );
};

export default AccessPanel;
