"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { ChatComponent } from "@/components/chat/chat-component";
import { usePandaSDK } from "@/providers/sdk-provider";
import { useAuth } from "@/sdk/hooks";
import toast from "react-hot-toast";
import { Chat } from "@/sdk/Chat";
import { UUID } from "crypto";
import { usePrivy } from "@privy-io/react-auth";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { sdk, isReady } = usePandaSDK();
  const { ready: privyReady } = usePrivy();
  const chatId = params?.chatId as UUID | undefined;
  const { isAuthenticated } = useAuth();

  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionDataForValidation, setSessionDataForValidation] =
    useState<Chat | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      if (!privyReady) {
        setIsLoadingState(true);
        return;
      }
  
      if (!isAuthenticated) {
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
  
      const currentSession = await sdk.chat.getChat(chatId);
      sdk.chat.setActiveChatId(chatId);
      if (currentSession) {
        sdk.chat.setActiveChat(currentSession);
        setIsValidSession(true);
        setSessionDataForValidation(currentSession);
      } else {
        setIsValidSession(false);
        setSessionDataForValidation(null);
      }
      setIsLoadingState(false);
    }
    validateSession();
    }, [
      chatId,
      isReady,
      isAuthenticated,
      router,
      sdk,
    ]);


  useEffect(() => {
    if (!isLoadingState && !isValidSession) {
      if (isAuthenticated) {
        toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
        router.replace("/");
      } else if (!isReady && !isAuthenticated) {
        router.replace("/");
      }
    }
  }, [
    isLoadingState,
    isValidSession,
    chatId,
    router,
    isAuthenticated,
    isReady,
  ]);

  if (isLoadingState) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isReady && !isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <CircularProgress color="primary" />
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
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <CircularProgress color="primary" />
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
