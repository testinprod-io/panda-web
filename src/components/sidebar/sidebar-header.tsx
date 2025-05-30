"use client";

// import { Box, IconButton, Tooltip, Typography } from '@mui/material'; // Box and Typography removed
import { IconButton, Tooltip } from '@mui/material'; // Keeping IconButton and Tooltip for now
// import SearchMuiIcon from '@mui/icons-material/Search'; // Commented out in original
// import { useRouter } from 'next/navigation'; // Not used
// import { useChatStore } from '@/store/chat'; // Not used
// import styles from './sidebar.module.scss'; // Removed
import { Montserrat } from 'next/font/google';
// import clsx from 'clsx'; // Will replace with template literals for conditional classes

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '500'], // Assuming '500' was for logoTextNormal which is not used here
});

interface SidebarHeaderProps {
  isSidebarCollapsed: boolean;
}

export default function SidebarHeader({ isSidebarCollapsed }: SidebarHeaderProps) {
  // const router = useRouter(); // Not used
  // const store = useChatStore(); // Not used

  // const handleSearch = () => { // Commented out in original
  //   console.log("Search icon clicked");
  //   // Implement search functionality
  // };

  const handleSettings = () => {
    console.log("Settings icon clicked");
    window.location.hash = 'settings';
  };

  const sidebarHeaderContainerClasses = `
    flex flex-col
    ${isSidebarCollapsed ? 'py-4 px-3' : 'py-4 px-[31px]'} 
  `;

  const sidebarHeaderIconRowClasses = `
    flex justify-between items-center h-12 w-full
  `; // text-white and icon colors need careful handling

  const sidebarHeaderLogoRowClasses = `
    flex items-center h-12 w-full box-border
    transition-all duration-300 ease-in-out
    ${isSidebarCollapsed ? 'flex-col w-fit gap-1.5 pl-[18px]' : 'flex-row gap-2 px-3 py-2 rounded-lg'}
  `;
  
  const sidebarHeaderLogoTextContainerClasses = `
    flex items-center text-[#1E1E1E] font-montserrat text-xl tracking-[0.80px] font-semibold leading-tight
    ${isSidebarCollapsed ? 'm-0 text-center' : ''}
    transition-none 
  `;
  // transition: 'none' is default, so explicitly adding transition-none might not be needed
  // but added for clarity matching sx prop.

  return (
    <div className={sidebarHeaderContainerClasses}>
      <div className={sidebarHeaderIconRowClasses}>
        {(!isSidebarCollapsed && (
          <>
            {/* Wrapper for left-aligned icons */}
            <div className="flex items-center">
              {/* <Tooltip title="Search">
                <IconButton onClick={handleSearch} className="text-[#757575]">
                  <SearchMuiIcon />
                </IconButton>
              </Tooltip> */}
              {/* Add other left-aligned icons here if needed */}
            </div>

            {/* Right-aligned icon(s) */}
            <Tooltip title="Settings">
              {/* IconButton color is tricky with MUI + Tailwind. SCSS had :global(.MuiIconButton-root) { color: white; }
                  and sx={{ color: '#757575' }}. The sx prop likely wins.
                  If the intent was for the icon *inside* to be #757575, but button itself different, more classes needed.
                  For now, applying text color that would affect the icon if it inherits.
              */}
              <IconButton onClick={handleSettings} className="text-[#757575]">
                <img 
                  src="/icons/settings.svg" 
                  alt="Settings" 
                  className="w-6 h-6" // from style={{ width: '24px', height: '24px' }}
                  style={{ filter: 'invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(80%)' }} // Kept complex filter
                />
              </IconButton>
            </Tooltip>
          </>
        ))}
      </div>

      <div className={sidebarHeaderLogoRowClasses}>
        <img src="/icons/logo.png" alt="Panda AI Logo" className="w-8 h-8 rounded" /> {/* from .sidebarHeaderLogoImage */}
        <div className={sidebarHeaderLogoTextContainerClasses}>
          {/* Typography replaced with div and Tailwind classes for font */}
          <span 
            className="font-montserrat font-semibold text-xl tracking-[0.80px]" 
            // sx={{ fontFamily: montserrat.style.fontFamily, fontWeight: 600 }} is now Tailwind
          >
            PANDA
          </span>
        </div>
      </div>
    </div>
  );
} 