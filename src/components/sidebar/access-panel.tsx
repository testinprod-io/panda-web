import React from 'react';
// import styles from './access-panel.module.scss'; // Removed

interface AccessPanelProps {
  onLockServiceClick?: () => void;
}

const AccessPanel: React.FC<AccessPanelProps> = ({ onLockServiceClick }) => {
  return (
    <div className="w-full flex flex-col items-start inline-flex">
      <div className="w-[376px] flex flex-col justify-start items-start gap-1.5">
        <div className="flex justify-center flex-col text-[#979797] text-base font-inter font-normal break-words">Access</div>
      </div>
      <div 
        className="self-stretch h-12 flex justify-start items-center cursor-pointer transition-colors duration-200 ease-in-out rounded-lg hover:bg-[#B3B3B3]"
        onClick={onLockServiceClick}
        role="button"
        tabIndex={0}
      >
        <div className="p-3 flex justify-start items-center gap-2.5">
          <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center" data-size="20">
            <img src="/icons/lock-icon.svg" alt="Lock" className="w-5 h-5" />
            {/* <div className={styles.lockIconOutline} /> */}
          </div>
        </div>
        <div className="w-[292px] flex justify-center flex-col text-[#1E1E1E] text-base font-inter font-medium break-words">Lock Panda</div>
      </div>
    </div>
  );
};

export default AccessPanel;
