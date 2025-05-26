"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useChatStore } from "@/store/chat";
import { useEffect, useState, useCallback } from "react";
import { Chat } from "@/components/chat/chat";
import { useAuthStatus } from "@/hooks/use-auth-status";
import toast from "react-hot-toast";
import { ChatSession, EncryptedMessage } from "@/types";
import { UUID } from "crypto";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();
  
  const chatId = params?.chatId as UUID | undefined;
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();

  const [isLoadingState, setIsLoadingState] = useState(true); // Overall page loading
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionDataForValidation, setSessionDataForValidation] = useState<ChatSession | null>(null);

  useEffect(() => {
    const isStoreHydrated = store._hasHydrated;
    if (!isAuthReady || !isStoreHydrated) {
      setIsLoadingState(true);
      return;
    }

    // If auth is ready but user is not authenticated, handle redirect
    if (isAuthReady && !isAuthenticated) {
      // To avoid rendering chat components if not authenticated.
      setIsLoadingState(false); // Stop general loading indicator
      setIsValidSession(false); // Ensure chat is not considered valid
      setSessionDataForValidation(null);
      // Optionally, show a toast and redirect
      // toast.error("Authentication required to view chat."); // Consider if toast is too intrusive
      // router.replace("/"); // Or a more specific login/access denied page
      return;
    }
    
    // Proceed if auth is ready AND authenticated
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
  }, [chatId, isAuthReady, isAuthenticated, store._hasHydrated, store.sessions, store, router]);

  useEffect(() => {
    if (!isLoadingState && !isValidSession) {
      // Add a check for authentication here as well before redirecting for "not found"
      // If not authenticated, the previous effect should handle it or we show a different message.
      if (isAuthenticated) { // Only show "not found" if authenticated but session is invalid
        toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
        router.replace("/");
      } else if (isAuthReady && !isAuthenticated) { // Auth is ready, but user is not logged in
        toast.error("Please log in to access chat sessions.");
        router.replace("/"); // Or a login page
      }
      // If !isAuthReady, isLoadingState should be true, so this block might not be hit.
    }
  }, [isLoadingState, isValidSession, chatId, router, isAuthenticated, isAuthReady]);

  if (isLoadingState) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
  }

  // If auth is ready, but user is not authenticated, show appropriate message.
  // This handles the state after isLoadingState is false but before session validation.
  if (isAuthReady && !isAuthenticated) {
    return <Typography sx={{ p: 2 }}>Authentication required to access chat. Please log in.</Typography>;
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
