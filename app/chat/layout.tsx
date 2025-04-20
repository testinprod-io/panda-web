"use client"; // Required for useState

import { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from '@/app/components/Sidebar';
import ChatHeader from '@/app/components/ChatHeader'; // Import ChatHeader

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleCollapseSidebar = () => {
    setIsSidebarCollapsed(true);
  };

  const handleRevealSidebar = () => {
    setIsSidebarCollapsed(false);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar 
        isSidebarCollapsed={isSidebarCollapsed} 
        onCollapseSidebar={handleCollapseSidebar} 
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ChatHeader 
          isSidebarCollapsed={isSidebarCollapsed} 
          onRevealSidebar={handleRevealSidebar} 
        />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
} 