"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useChatStore } from "@/app/store/chat";
import { useChatActions } from "@/app/hooks/useChatActions";
import { useEffect, useState, useCallback } from "react";
import { Chat } from "@/app/components/chat/Chat";
import { useAuthStatus } from "@/app/hooks/useAuthStatus";
import toast from "react-hot-toast";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();
  
  const chatId = params?.chatId as string | undefined;

  const { isReady: isAuthReady } = useAuthStatus();

  const [isLoading, setIsLoading] = useState(true);
  // let isLoading = true;
  // let isValidSession = false;
  const [isValidSession, setIsValidSession] = useState<boolean>(false);

  // Effect 1: Validate chat ID and determine initial loading state
  useEffect(() => {
  console.log(
    `[ChatPage Effect 1] Running. chatId: ${chatId}, isAuthReady: ${isAuthReady}`
  );
  const isStoreHydrated = store._hasHydrated;

  if (!isAuthReady || !isStoreHydrated) {
    // isLoading = true;
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
  const sessions = store.sessions;
  const sessionExists = sessions.some((s) => s.id === chatId);

  if (sessionExists) {
    console.log(`[ChatPage Effect 1] Session ${chatId} exists.`);
    // isValidSession = true;
    setIsValidSession(true);
  } else {
    console.warn(
      `[ChatPage Effect 1] Session ${chatId} not found in store. Marking as invalid.`
    );
    // isValidSession = false;
    setIsValidSession(false);
  }

    setIsLoading(false); // Done with initial validation

  }, [chatId, isAuthReady]); // Depends only on chatId and auth readiness

  // Effect 3: Handle redirection if the session is marked as invalid
  useEffect(() => {
  console.log(
    `[ChatPage Effect 3] Running. isLoading: ${isLoading}, isValidSession: ${isValidSession}`
  );
  // Redirect only when loading is complete AND session is confirmed as invalid.
  if (!isLoading && isValidSession === false) {
    console.log(
      `[ChatPage Effect 3] Redirecting: Chat session not found or invalid for ${
        chatId || "ID missing"
      }`
    );
    toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
    router.replace("/chat");
  }
  }, [isLoading, isValidSession, chatId, router]);

  // Conditional rendering based on loading and validity state
  if (isLoading) {
    console.log("[ChatPage] Render: isLoading=true. Showing CircularProgress.");
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

  if (isValidSession === false) {
    console.log(
      "[ChatPage] Render: isValidSession=false. Showing redirect message."
    );
    return (
      <Typography sx={{ p: 2 }}>Chat not found. Redirecting...</Typography>
    );
  }

  if (isValidSession === true) {
    console.log("[ChatPage] Render: isValidSession=true. Rendering <Chat />.");
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Chat />
      </Box>
    );
  }

  // Fallback or initial render before states are determined (should be brief)
  console.log(
    "[ChatPage] Render: Fallback (initial state or unexpected). Showing loading or null."
  );
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
  ); // Or return null, but loading is safer
}
