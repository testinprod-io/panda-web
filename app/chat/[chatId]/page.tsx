"use client";

import { useParams, useRouter } from "next/navigation";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useChatStore } from "@/app/store/chat";
// import { useChatActions } from "@/app/hooks/useChatActions"; // Not directly used here for now
import { useEffect, useState, useCallback, useRef } from "react";
import { Chat } from "@/app/components/chat/Chat"; // This is the container, might need ChatComponent directly
import { ChatLayout } from "@/app/components/chat/ChatLayout"; // Import the new layout
import { useAuthStatus } from "@/app/hooks/useAuthStatus";
import toast from "react-hot-toast";
import { ChatSession, EncryptedMessage } from "@/app/types"; // For session type
import { ModelConfig } from "@/app/store"; // For modelConfig type
import { UUID } from "crypto";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const store = useChatStore();
  
  const chatId = params?.chatId as UUID | undefined;

  const { isReady: isAuthReady } = useAuthStatus();

  // --- State and Refs managed by ChatPage for ChatLayout and Chat/ChatComponent ---
  const [isLoadingState, setIsLoadingState] = useState(true); // Overall page loading
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [sessionData, setSessionData] = useState<ChatSession | null>(null);
  const [currentModelConfig, setCurrentModelConfig] = useState<ModelConfig | undefined>(undefined);

  const [isLayoutLoading, setIsLayoutLoading] = useState(false); // For ChatInputPanel's loading state
  const [hitBottom, setHitBottom] = useState(true);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false); 
  // We also need EditMessageModal state if Chat.tsx is to be simplified
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<EncryptedMessage | undefined>();

  const submitHandlerRef = useRef<((input: string, images: string[]) => Promise<void>) | null>(null);
  const scrollToBottomFuncRef = useRef<(() => void) | null>(null);

  // Callbacks for ChatComponent (via Chat.tsx) to register its functions/state changes
  const exportSubmitHandlerFromChild = useCallback((handler: (input: string, images: string[]) => Promise<void>) => {
    submitHandlerRef.current = handler;
  }, []);

  const handleHitBottomChangeFromChild = useCallback((isAtBottom: boolean) => {
    setHitBottom(isAtBottom);
  }, []);

  const exportScrollToBottomFuncFromChild = useCallback((func: () => void) => {
    scrollToBottomFuncRef.current = func;
  }, []);

  // --- Handlers for ChatLayout --- 
  const onSendMessageToLayout = useCallback(async (input: string, images: string[]) => {
    if (submitHandlerRef.current) {
      await submitHandlerRef.current(input, images);
    } else {
      console.warn("[ChatPage] Submit handler not registered by ChatComponent.");
    }
  }, []);

  const scrollToBottomForLayout = useCallback(() => {
    if (scrollToBottomFuncRef.current) {
      scrollToBottomFuncRef.current();
    }
  }, []);

  // --- Modal handlers for Chat.tsx (if it continues to manage modals) ---
  // Or, these could be passed directly to ChatLayout if Chat.tsx becomes a pure presenter of ChatComponent
  const handleShowPromptModal = () => setShowPromptModal(true);
  const handleShowShortcutKeyModal = () => setShowShortcutKeyModal(true);
  const handleShowEditMessageModal = (message: EncryptedMessage) => {
      setEditingMessage(message);
      setShowEditMessageModal(true);
  };

  // Effect 1: Validate chat ID and determine initial loading state
  useEffect(() => {
    console.log(
      `[ChatPage Effect 1] Running. chatId: ${chatId}, isAuthReady: ${isAuthReady}`
    );
    const isStoreHydrated = store._hasHydrated;

    if (!isAuthReady || !isStoreHydrated) {
      setIsLoadingState(true); // Still waiting for auth or hydration
      return;
    }

    if (!chatId) {
      console.warn("[ChatPage Effect 1] Chat ID missing. Marking as invalid.");
      setIsValidSession(false);
      setSessionData(null);
      setIsLoadingState(false);
      return;
    }

    const currentSession = store.sessions.find((s) => s.id === chatId);

    if (currentSession) {
      console.log(`[ChatPage Effect 1] Session ${chatId} exists.`);
      setIsValidSession(true);
      setSessionData(currentSession);
      setCurrentModelConfig(currentSession.modelConfig);
    } else {
      console.warn(
        `[ChatPage Effect 1] Session ${chatId} not found in store. Marking as invalid.`
      );
      setIsValidSession(false);
      setSessionData(null);
    }

    setIsLoadingState(false); // Done with initial validation

  }, [chatId, isAuthReady, store._hasHydrated, store.sessions]);

  // Effect 3: Handle redirection if the session is marked as invalid
  useEffect(() => {
    console.log(
      `[ChatPage Effect 3] Running. isLoadingState: ${isLoadingState}, isValidSession: ${isValidSession}`
    );
    if (!isLoadingState && isValidSession === false) {
      console.log(
        `[ChatPage Effect 3] Redirecting: Chat session not found or invalid for ${
          chatId || "ID missing"
        }`
      );
      toast.error(`Chat session not found: ${chatId || "Invalid ID"}`);
      router.replace("/chat");
    }
  }, [isLoadingState, isValidSession, chatId, router]);

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

  if (!isValidSession || !sessionData) {
    return (
      <Typography sx={{ p: 2 }}>Chat not found. Redirecting...</Typography>
    );
  }
  
  // If session is valid, render ChatLayout with Chat (which contains ChatComponent)
  return (
    <ChatLayout 
      sessionId={sessionData.id} 
      modelConfig={currentModelConfig}
      onSendMessage={onSendMessageToLayout} // From this page's ref, set by ChatComponent
      hitBottom={hitBottom} // From this page's state, set by ChatComponent via callback
      scrollToBottom={scrollToBottomForLayout} // From this page's ref
      setShowPromptModal={handleShowPromptModal} // This page's handler
      setShowShortcutKeyModal={handleShowShortcutKeyModal} // This page's handler
      isBusyUpstream={isLayoutLoading} // Pass the page-level loading state here
    >
      <Chat 
        // Pass session Id for ChatComponent key and direct use
        // Chat.tsx will pass these down to ChatComponent
        _sessionId={sessionData.id} // Using a prefixed prop to avoid conflict if Chat has its own session logic
        _setIsLoadingLayout={setIsLayoutLoading} // Page's state setter for layout's input panel
        _exportSubmitHandler={exportSubmitHandlerFromChild}
        _onHitBottomChange={handleHitBottomChangeFromChild}
        _exportScrollToBottomFunc={exportScrollToBottomFuncFromChild}
        // Modal handlers that Chat.tsx might use or pass down
        _handleShowEditMessageModal={handleShowEditMessageModal}
        _editingMessage={editingMessage}
        _setShowEditMessageModalState={setShowEditMessageModal}
        // Pass other modal states/handlers if Chat.tsx is responsible for them
        _showPromptModalState={showPromptModal}
        _setShowPromptModalState={setShowPromptModal} 
      />
    </ChatLayout>
  );
}
