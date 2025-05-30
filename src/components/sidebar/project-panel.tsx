import React from 'react';
import clsx from 'clsx';

interface ProjectPanelProps {
  onNewChat: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ onNewChat }) => {
  return (
    <div className="w-full flex flex-col items-start">
      <div className="w-full flex flex-col items-start gap-1.5 pb-1.5 mb-1">
        <div className="flex flex-col justify-center px-4 md:px-0">
          <span className="text-gray-500 text-base font-inter font-normal">Project</span>
        </div>
      </div>
      <div 
        className={clsx(
          "self-stretch h-12 flex items-center rounded-lg transition-colors duration-200 ease-in-out",
          "cursor-pointer hover:bg-gray-200"
        )}
        onClick={onNewChat}
        role="button"
        tabIndex={0}
      >
        <div className="p-3 flex items-center gap-2.5">
          <div className="w-5 h-5 relative overflow-hidden flex items-center justify-center">
            <img src="/icons/new-chat.svg" alt="New Chat" className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-col justify-center text-gray-800 text-base font-inter font-medium">
          New chat
        </div>
      </div>
    </div>
  );
};

export default ProjectPanel; 