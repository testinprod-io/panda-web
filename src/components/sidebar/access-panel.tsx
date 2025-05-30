import React from 'react';
import clsx from 'clsx'; // Assuming clsx is available for conditional classes
// import styles from './access-panel.module.scss'; // SCSS import removed

interface AccessPanelProps {
  onLockServiceClick?: () => void;
}

const AccessPanel: React.FC<AccessPanelProps> = ({ onLockServiceClick }) => {
  return (
    <div className="w-full flex flex-col items-start"> {/* .container styles */}
      <div className="w-full md:w-[376px] flex flex-col items-start gap-1.5 mb-2"> {/* .accessHeaderContainer, adjusted width for responsiveness, mb for spacing */}
        <div className="flex flex-col justify-center px-4 md:px-0"> {/* Added padding for header text on mobile */}
          <span className="text-gray-500 text-base font-inter font-normal">Access</span> {/* .accessHeaderText styles */}
        </div>
      </div>
      <div 
        className={clsx(
          "self-stretch h-12 flex items-center rounded-lg transition-colors duration-200 ease-in-out", // .row base styles
          onLockServiceClick && "cursor-pointer hover:bg-gray-200" // Conditional hover if clickable
        )}
        onClick={onLockServiceClick}
        role={onLockServiceClick ? "button" : undefined}
        tabIndex={onLockServiceClick ? 0 : undefined}
      >
        <div className="p-3 flex items-center gap-2.5"> {/* .iconContainer styles */}
          <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center"> {/* .iconWrapper styles */}
            <img src="/icons/lock-icon.svg" alt="Lock" className="w-5 h-5" /> {/* .lockIcon styles applied directly */}
          </div>
        </div>
        <div className="flex flex-col justify-center text-gray-800 text-base font-inter font-medium"> {/* .lockServiceText styles (width removed, let flex handle it) */}
          Lock Panda
        </div>
      </div>
    </div>
  );
};

export default AccessPanel;
