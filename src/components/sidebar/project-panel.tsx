import React from 'react';
// import styles from './project-panel.module.scss'; // Removed

interface ProjectPanelProps {
  onNewChat: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ onNewChat }) => {
  return (
    <div className="w-full flex flex-col justify-start items-start inline-flex">
      <div className="flex flex-col justify-start items-start gap-1.5 pb-1.5">
        <div className="flex justify-center flex-col text-[#979797] text-base font-inter font-normal break-words">Project</div>
      </div>
      <div 
        className="self-stretch h-12 flex justify-start items-center cursor-pointer transition-colors duration-200 ease-in-out rounded-lg hover:bg-[#B3B3B3]"
        onClick={onNewChat}
        role="button"
        tabIndex={0}
      >
        <div className="p-3 flex justify-start items-center gap-2.5"> 
          <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center" data-size="20">
            <img src="/icons/new-chat.svg" alt="New Chat" className="w-5 h-5" />
            {/* <div className={styles.newChatIconOutline} /> */}
          </div>
        </div>
        <div className="flex justify-center flex-col text-[#1E1E1E] text-base font-inter font-medium break-words">New chat</div>
      </div>
    </div>
  );
};

export default ProjectPanel; 