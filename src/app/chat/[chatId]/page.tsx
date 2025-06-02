"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useChatStore } from "@/store/chat";
import { useEffect, useState } from "react";
import { MemoizedChatComponent } from "@/components/chat/chat-component";

import { useAuthStatus } from "@/hooks/use-auth-status";
import toast from "react-hot-toast";
import { ChatSession } from "@/types";
import { UUID } from "crypto";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();

  const chatId = params?.chatId as UUID | undefined;
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();

  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionDataForValidation, setSessionDataForValidation] =
    useState<ChatSession | null>(null);

  useEffect(() => {
    const isStoreHydrated = store._hasHydrated;
    if (!isAuthReady || !isStoreHydrated) {
      setIsLoadingState(true);
      return;
    }

    if (isAuthReady && !isAuthenticated) {
      setIsLoadingState(false);
      setIsValidSession(false);
      setSessionDataForValidation(null);
      return;
    }

    if (!chatId) {
      setIsValidSession(false);
      setSessionDataForValidation(null);
      setIsLoadingState(false);
      return;
    }

    const currentSession = store.sessions.find((s) => s.id === chatId);
    if (currentSession) {
      if (store.currentSession()?.id !== chatId) {
        const sessionIndex = store.sessions.findIndex((s) => s.id === chatId);
        if (sessionIndex !== -1) {
          store.setCurrentSessionIndex(sessionIndex);
        }
      }
      setIsValidSession(true);
      setSessionDataForValidation(currentSession);
    } else {
      setIsValidSession(false);
      setSessionDataForValidation(null);
    }
    setIsLoadingState(false);
  }, [
    chatId,
    isAuthReady,
    isAuthenticated,
    store._hasHydrated,
    store.sessions,
    store,
    router,
  ]);

  useEffect(() => {
    if (!isLoadingState && !isValidSession) {
      if (isAuthenticated) {
        toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
        router.replace("/");
      } else if (isAuthReady && !isAuthenticated) {
        toast.error("Please log in to access chat sessions.");
        router.replace("/");
      }
    }
  }, [
    isLoadingState,
    isValidSession,
    chatId,
    router,
    isAuthenticated,
    isAuthReady,
  ]);

  if (isLoadingState) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthReady && !isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isValidSession || !sessionDataForValidation) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <MemoizedChatComponent
      key={sessionDataForValidation.id}
      sessionId={sessionDataForValidation.id}
      session={sessionDataForValidation}
    />
  );
}
