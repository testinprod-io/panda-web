"use client";

import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useChatStore } from '@/app/store/chat';
import { ChatSession } from '@/app/types';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Chat } from '@/app/components/chat/Chat';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import toast from 'react-hot-toast';

let renderCount = 0; // Module-level counter for renders

export default function ChatPage() {
  renderCount++;
  console.log(`[ChatPage] Render #${renderCount}`);

  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string | undefined;
  const sessions = useChatStore((state) => state.sessions);
  const selectSession = useChatStore((state) => state.selectSession);
  const currentSessionId = useChatStore((state) => state.currentSession()?.id);
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidChatId, setIsValidChatId] = useState<boolean | null>(null);

  useEffect(() => {
    const isHydrated = useChatStore.persist.hasHydrated();
    console.log(`[ChatPage] useEffect run: isAuthReady=${isAuthReady}, isHydrated=${isHydrated}, chatId=${chatId}`);

    // Wait for auth and store hydration
    if (!isAuthReady || !isHydrated) {
      // Only set loading if not already loading
      if (isLoading) setIsLoading(true);
      console.log(`[ChatPage] useEffect end: Waiting for auth/hydration.`);
      return;
    }

    // Validate chatId presence
    if (!chatId) {
        console.warn("Chat ID missing from params");
        // Only update state if validity is not already false
        if (isValidChatId !== false) setIsValidChatId(false);
        if (isLoading) setIsLoading(false); // Allow redirect effect to run
        console.log(`[ChatPage] useEffect end: Invalid chatId - setting state (if changed)`);
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
      console.log(`[ChatPage] useEffect: Found sessionIndex=${sessionIndex}. Current selected session ID=${currentSessionId}`);
      if (currentSessionId !== chatId) {
         console.log(`[ChatPage] useEffect: Calling selectSession(${sessionIndex}) for chatId=${chatId}`);
         selectSession(sessionIndex);
         console.log(`[ChatPage] useEffect: Called selectSession(${sessionIndex})`);
         // Note: selectSession itself will trigger a re-render eventually
      }
      // Only set loading false if it's currently true
      if (isLoading) setIsLoading(false);
      console.log(`[ChatPage] useEffect end: Valid session found - setting state (if changed)`);
    } else {
      // Chat ID exists but doesn't match any session
      // Only update state if validity is not already false
      if (isValidChatId !== false) setIsValidChatId(false);
      if (isLoading) setIsLoading(false); // Allow redirect effect to run
      console.log(`[ChatPage] useEffect end: Session not found - setting state (if changed)`);
    }
    // Effect primarily reacts to auth readiness and the specific chat ID changing.
    // SelectSession is included as it's called within.
    // currentSessionId is added because we compare against it, though selectSession should update it.
    // sessions is added because findIndex depends on it.
  }, [isAuthReady, chatId, selectSession, sessions, currentSessionId]); // Refined dependency array including selected state

  useEffect(() => {
    console.log(`[ChatPage] Redirect Effect run: isLoading=${isLoading}, isValidChatId=${isValidChatId}`);
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

  console.log(`[ChatPage] Render #${renderCount}: Rendering <Chat />`);
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