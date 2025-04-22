"use client";

import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useChatStore } from '@/app/store/chat';
import { useChatActions } from '@/app/hooks/useChatActions';
import { ChatSession } from '@/app/types';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Chat } from '@/app/components/chat/Chat';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string | undefined;
  const sessions = useChatStore((state) => state.sessions);
  const { selectSession } = useChatActions();
  const currentSessionId = useChatStore((state) => state.currentSession()?.id);
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidChatId, setIsValidChatId] = useState<boolean | null>(null);

  useEffect(() => {
    const isHydrated = useChatStore.persist.hasHydrated();
    // Wait for auth and store hydration
    if (!isAuthReady || !isHydrated) {
      // Only set loading if not already loading
      if (isLoading) setIsLoading(true);
      return;
    }

    // Validate chatId presence
    if (!chatId) {
        console.warn("Chat ID missing from params");
        // Only update state if validity is not already false
        if (isValidChatId !== false) setIsValidChatId(false);
        if (isLoading) setIsLoading(false); // Allow redirect effect to run
        return;
    }

    // Access latest sessions directly from store inside effect
    const currentSessions = useChatStore.getState().sessions;
    const sessionIndex = currentSessions.findIndex(s => s.id === chatId);

    if (sessionIndex !== -1) {
      // Only update state if validity is not already true
      if (isValidChatId !== true) setIsValidChatId(true);
      // Select the session if it's not already the current one
      // Access latest currentSession directly from store inside effect
      // const currentSessionId = useChatStore.getState().currentSession()?.id;
      // Use the selected currentSessionId from component scope
      // REMOVED: We assume ChatList onClick already called selectSession
      // if (currentSessionId !== chatId) {
      //    selectSession(sessionIndex);
      // }
      // Only set loading false if it's currently true
      if (isLoading) setIsLoading(false);
    } else {
      // Chat ID exists but doesn't match any session
      // Only update state if validity is not already false
      if (isValidChatId !== false) setIsValidChatId(false);
      if (isLoading) setIsLoading(false); // Allow redirect effect to run
    }
    // Effect primarily reacts to auth readiness and the specific chat ID changing.
    // SelectSession is included as it's called within.
    // currentSessionId is added because we compare against it, though selectSession should update it.
    // sessions is added because findIndex depends on it.
  }, [isAuthReady, chatId, selectSession, sessions, currentSessionId]); // Refined dependency array including selected state

  useEffect(() => {
    // Redirect only when validity is confirmed as false and loading is done
    if (!isLoading && isValidChatId === false) {
      console.log(`[ChatPage] Redirecting: Chat session not found for ${chatId || 'Invalid ID'}`);
      toast.error(`Chat session not found: ${chatId || 'Invalid ID'}`);
      router.replace('/chat'); // Use replace to avoid polluting history
    }
  }, [isLoading, isValidChatId, chatId, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isValidChatId === false) {
     return <Typography sx={{ p: 2 }}>Chat not found. Redirecting...</Typography>;
  }

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