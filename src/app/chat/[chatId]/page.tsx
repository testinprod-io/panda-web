"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useChatStore } from "@/store/chat";
import { useEffect, useState, useCallback } from "react";
import { Chat } from "@/components/chat/Chat";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import toast from "react-hot-toast";
import { ChatSession, EncryptedMessage } from "@/types";
import { UUID } from "crypto";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();
  
  const chatId = params?.chatId as UUID | undefined;
  const { isReady: isAuthReady } = useAuthStatus();

  const [isLoadingState, setIsLoadingState] = useState(true); // Overall page loading
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionDataForValidation, setSessionDataForValidation] = useState<ChatSession | null>(null);

  useEffect(() => {
    const isStoreHydrated = store._hasHydrated;
    if (!isAuthReady || !isStoreHydrated) {
      setIsLoadingState(true);
      return;
    }
    if (!chatId) {
      setIsValidSession(false); setSessionDataForValidation(null); setIsLoadingState(false);
      return;
    }
    const currentSession = store.sessions.find((s) => s.id === chatId);
    if (currentSession) {
      if (store.currentSession()?.id !== chatId) {
        const sessionIndex = store.sessions.findIndex(s => s.id === chatId);
        if (sessionIndex !== -1) {
          store._selectSessionIndex(sessionIndex);
        }
      }
      setIsValidSession(true); setSessionDataForValidation(currentSession); 
    } else {
      setIsValidSession(false); setSessionDataForValidation(null);
    }
    setIsLoadingState(false);
  }, [chatId, isAuthReady, store._hasHydrated, store.sessions, store]);

  useEffect(() => {
    if (!isLoadingState && !isValidSession) {
      toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
      router.replace("/");
    }
  }, [isLoadingState, isValidSession, chatId, router]);

  if (isLoadingState) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
  }
  if (!isValidSession || !sessionDataForValidation) {
    return <Typography sx={{ p: 2 }}>Chat not found. Redirecting...</Typography>;
  }
  
  return (
      <Chat 
        _sessionId={sessionDataForValidation.id}
      />
  );
}
