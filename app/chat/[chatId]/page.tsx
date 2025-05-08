"use client";

import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useChatStore } from '@/app/store/chat';
import { useChatActions } from '@/app/hooks/useChatActions';
import { useEffect, useState, useCallback } from 'react';
import { Chat } from '@/app/components/chat/Chat';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string | undefined;

  const { selectSession } = useChatActions();
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus(); 

  const [isLoading, setIsLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Effect 1: Validate chat ID and determine initial loading state
  useEffect(() => {
    console.log(`[ChatPage Effect 1] Running. chatId: ${chatId}, isAuthReady: ${isAuthReady}`);
    const isStoreHydrated = useChatStore.persist.hasHydrated();

    if (!isAuthReady || !isStoreHydrated) {
      setIsLoading(true); // Still waiting for auth or hydration
      return;
    }

    if (!chatId) {
      console.warn("[ChatPage Effect 1] Chat ID missing. Marking as invalid.");
      setIsValidSession(false);
      setIsLoading(false);
      return;
    }

    // Access sessions directly from the store ONLY when needed for validation
    const sessions = useChatStore.getState().sessions;
    const sessionExists = sessions.some(s => s.id === chatId);

    if (sessionExists) {
      console.log(`[ChatPage Effect 1] Session ${chatId} exists.`);
      setIsValidSession(true);
    } else {
      console.warn(`[ChatPage Effect 1] Session ${chatId} not found in store. Marking as invalid.`);
      setIsValidSession(false);
    }
    setIsLoading(false); // Done with initial validation

  }, [chatId, isAuthReady]); // Depends only on chatId and auth readiness

  // Effect 2: Select the session if it's valid and not already current
  useEffect(() => {
    const currentChatIdInStore = useChatStore.getState().currentSession()?.id;
    console.log(`[ChatPage Effect 2] Running. isValidSession: ${isValidSession}, chatId: ${chatId}, currentChatIdInStore: ${currentChatIdInStore}`);

    if (isValidSession && chatId && chatId !== currentChatIdInStore) {
      const sessions = useChatStore.getState().sessions; // Get fresh sessions
      const sessionIndexToSelect = sessions.findIndex(s => s.id === chatId);
      if (sessionIndexToSelect !== -1) {
        console.log(`[ChatPage Effect 2] Selecting session ${chatId} at index ${sessionIndexToSelect}`);
        selectSession(sessionIndexToSelect);
      } else {
        // This case should ideally be caught by Effect 1 setting isValidSession to false
        console.warn(`[ChatPage Effect 2] Valid session ${chatId} suddenly not found for selection. This might indicate a race condition or rapid store update.`);
        setIsValidSession(false); // Corrective action: mark as invalid if not found during selection attempt
      }
    }
  }, [isValidSession, chatId, selectSession]); // Depends on validity, chatId, and the stable selectSession action
  
  // Effect 3: Handle redirection if the session is marked as invalid
  useEffect(() => {
    console.log(`[ChatPage Effect 3] Running. isLoading: ${isLoading}, isValidSession: ${isValidSession}`);
    // Redirect only when loading is complete AND session is confirmed as invalid.
    if (!isLoading && isValidSession === false) {
      console.log(`[ChatPage Effect 3] Redirecting: Chat session not found or invalid for ${chatId || 'ID missing'}`);
      toast.error(`Chat session not found: ${chatId || 'Invalid ID'}`);
      router.replace('/chat');
    }
  }, [isLoading, isValidSession, chatId, router]);

  // Conditional rendering based on loading and validity state
  if (isLoading) {
    console.log('[ChatPage] Render: isLoading=true. Showing CircularProgress.');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isValidSession === false) {
    // This state handles the case where Effect 1 determined invalidity OR Effect 2 corrected it.
    // Effect 3 will handle the redirection from this state.
    console.log('[ChatPage] Render: isValidSession=false. Showing redirect message.');
    return <Typography sx={{ p: 2 }}>Chat not found. Redirecting...</Typography>;
  }
  
  if (isValidSession === true) {
    console.log('[ChatPage] Render: isValidSession=true. Rendering <Chat />.');
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Chat />
      </Box>
    );
  }

  // Fallback or initial render before states are determined (should be brief)
  console.log('[ChatPage] Render: Fallback (initial state or unexpected). Showing loading or null.');
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  ); // Or return null, but loading is safer
} 