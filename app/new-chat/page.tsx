'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/app/store'; // Adjust path if necessary
import { Path } from '@/app/constant'; // Adjust path if necessary
import { CircularProgress, Box } from '@mui/material'; // For loading indicator

export default function NewChatPage() {
  const router = useRouter();
  const chatStore = useChatStore();

  useEffect(() => {
    // Create a new session (this likely updates the store's state)
    chatStore.newSession();
    
    // Get the newly created (and likely selected) session from the store
    const currentSession = chatStore.currentSession();

    // Redirect to the new session's chat page if it exists
    if (currentSession) {
      router.replace(`${Path.Chat}/${currentSession.id}`);
    } else {
      // Handle error case: session creation failed or wasn't selected immediately
      console.error("[NewChatPage] Could not get current session after creation.");
      // Optionally redirect to a default page or show an error message
      router.replace(Path.Home); // Redirect home as a fallback
    }
    
  }, [chatStore, router]);

  // Display a loading indicator while the redirect is happening
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      height="100%"
    >
      <CircularProgress />
    </Box>
  );
} 