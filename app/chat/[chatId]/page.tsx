"use client";

import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useChatStore } from '@/app/store/chat';
import { useEffect, useState } from 'react';
import { Chat } from '@/app/components/chat/Chat';
import { useAuthStatus } from '@/app/hooks/useAuthStatus';
import toast from 'react-hot-toast';

// This is a basic placeholder for the chat page.
// You'll need to expand this to fetch/display messages for the given chat ID.

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string | undefined;
  const { sessions, selectSession, currentSession } = useChatStore();
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidChatId, setIsValidChatId] = useState<boolean | null>(null);

  useEffect(() => {
    const isStoreHydrated = useChatStore.persist.hasHydrated();

    if (!isAuthReady || !isStoreHydrated) {
      setIsLoading(true);
      return;
    }

    if (!chatId) {
        console.warn("Chat ID missing from params");
        toast.error("Invalid chat route.");
        router.replace('/chat');
        return;
    }

    const sessionIndex = sessions.findIndex(s => s.id === chatId);

    if (sessionIndex !== -1) {
      setIsValidChatId(true);
      if (currentSession()?.id !== chatId) {
         selectSession(sessionIndex);
      }
      setIsLoading(false);
    } else {
      setIsValidChatId(false);
      setIsLoading(false);
    }
  }, [isAuthReady, chatId, sessions, selectSession, router, currentSession]);

  useEffect(() => {
    if (isValidChatId === false) {
      toast.error(`Chat session not found: ${chatId}`);
      router.replace('/chat');
    }
  }, [isValidChatId, chatId, router]);

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