"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { useChatStore } from "@/store/chat";
import { useCallback, useEffect, useState } from "react";
import { ChatComponent } from "@/components/chat/chat-component";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useAuthStatus } from "@/hooks/use-auth-status";
import toast from "react-hot-toast";
import { Chat } from "@/sdk/Chat";
import { UUID } from "crypto";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();
  const { sdk } = usePandaSDK();
  const chatId = params?.chatId as UUID | undefined;
  const { isReady: isAuthReady, isAuthenticated } = useAuthStatus();

  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionDataForValidation, setSessionDataForValidation] =
    useState<Chat | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthReady) {
        console.log(`[ChatPage] Not ready`);
        setIsLoadingState(true);
        return;
      }
  
      if (isAuthReady && !isAuthenticated) {
        console.log(`[ChatPage] Not authenticated`);
        setIsLoadingState(false);
        setIsValidSession(false);
        setSessionDataForValidation(null);
        return;
      }
  
      if (!chatId) {
        console.log(`[ChatPage] No chatId`);
        setIsValidSession(false);
        setSessionDataForValidation(null);
        setIsLoadingState(false);
        return;
      }
  
      const currentSession = await sdk.chat.getChat(chatId);
      sdk.chat.setActiveChatId(chatId);
      if (currentSession) {
        console.log(`[ChatPage] Session found`);
        sdk.chat.setActiveChat(currentSession);
        setIsValidSession(true);
        setSessionDataForValidation(currentSession);
      } else {
        console.log(`[ChatPage] No session`);
        setIsValidSession(false);
        setSessionDataForValidation(null);
      }
      setIsLoadingState(false);
    }
    validateSession();
    }, [
      chatId,
      isAuthReady,
      isAuthenticated,
      router,
      sdk,
    ]);


  useEffect(() => {
    if (!isLoadingState && !isValidSession) {
      if (isAuthenticated) {
        toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
        router.replace("/");
      } else if (isAuthReady && !isAuthenticated) {
        // toast.error("Please log in to access chat sessions.");
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
    <ChatComponent
      key={sessionDataForValidation.id}
      sessionId={sessionDataForValidation.id}
      // session={sessionDataForValidation}
    />
  );
}
