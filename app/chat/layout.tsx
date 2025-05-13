"use client"; // Required for useState

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { Box } from '@mui/material';
import Sidebar from '@/app/components/sidebar';
import ChatHeader from '@/app/components/ChatHeader';
// import { ChatLayout as CustomChatLayout } from '@/app/components/chat/ChatLayout'; // No longer needed
import { ChatInputPanel } from '@/app/components/chat/ChatInputPanel'; // Import ChatInputPanel directly
import { useChatStore, useAppConfig } from '@/app/store';
import { UNFINISHED_INPUT } from '@/app/constant'; // For saving initial message
import { safeLocalStorage } from '@/app/utils';
import { useChatActions } from '@/app/hooks/useChatActions'; // For newSession
import { UUID } from 'crypto';
import Locale from "@/app/locales"; // For snackbar messages
import { useSnackbar } from "@/app/components/SnackbarProvider"; // For snackbar
import styles from "@/app/components/chat/chat.module.scss"; // Import styles for layout classes

const localStorage = safeLocalStorage();

export default function RootChatGroupLayout({ // Renamed for clarity
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const params = useParams();
  const router = useRouter(); // For redirecting after new session
  const appConfig = useAppConfig();
  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  // Get interactive state from Zustand store
  const onSendMessageHandlerFromStore = useChatStore((state) => state.onSendMessageHandler);
  const hitBottomFromStore = useChatStore((state) => state.hitBottom);
  const scrollToBottomHandlerFromStore = useChatStore((state) => state.scrollToBottomHandler);
  const showPromptModalHandlerFromStore = useChatStore((state) => state.showPromptModalHandler);
  const showShortcutKeyModalHandlerFromStore = useChatStore((state) => state.showShortcutKeyModalHandler);
  const isChatComponentBusyFromStore = useChatStore((state) => state.isChatComponentBusy);
  const clearChatInteractionHandlers = useChatStore((state) => state.clearChatInteractionHandlers);

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false); // For new chat submissions

  const currentChatId = params?.chatId as UUID | undefined;
  
  useEffect(() => {
    // When the chat ID changes (i.e., navigating between different chat sessions or to/from new chat)
    // clear the handlers associated with the previous ChatComponent instance.
    // This is important because ChatComponent registers its specific handlers on mount/update.
    // If we navigate to a new chat, the old handlers should not persist.
    clearChatInteractionHandlers();
  }, [currentChatId, clearChatInteractionHandlers]);

  const modelConfig = React.useMemo(() => {
    if (currentChatId) {
      const session = useChatStore.getState().sessions.find(s => s.id === currentChatId);
      return session?.modelConfig || appConfig.modelConfig;
    }
    return appConfig.modelConfig;
  }, [currentChatId, appConfig.modelConfig]);

  const handleLayoutSubmit = useCallback(
    async (input: string, files: {url: string, type: string, name: string}[]) => {
      if ((!input || !input.trim()) && files.length === 0) return;
      
      setInternalIsSubmitting(true);
      try {
        if (currentChatId && onSendMessageHandlerFromStore) { // Existing chat
          await onSendMessageHandlerFromStore(input, files);
          // Clearing unfinished input for existing chat is handled by ChatLayout.tsx's handleChatSubmit using this handler
          // No, it should be here after successful send via store handler
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else { // New chat (currentChatId is undefined)
          console.log("[RootChatGroupLayout] Starting new chat with:", input, files);
          const createdSession = await newSession(); 
          if (createdSession) {
            const newUserMessage = { input: input.trim(), files };
            localStorage.setItem(createdSession.id, JSON.stringify(newUserMessage)); // For ChatComponent to pick up
            localStorage.removeItem(UNFINISHED_INPUT(createdSession.id)); 
            router.replace(`/chat/${createdSession.id}`);
          } else {
            console.error("[RootChatGroupLayout] Failed to create new session.");
            showSnackbar("Failed to start new chat", "error");
          }
        }
      } catch (error) {
          console.error("[RootChatGroupLayout] Error during submission:", error);
          showSnackbar(Locale.Store.Error, "error");
      } finally {
        setInternalIsSubmitting(false);
      }
    },
    [currentChatId, onSendMessageHandlerFromStore, newSession, router, showSnackbar, appConfig.modelConfig]
  );

  const handleCollapseSidebar = () => setIsSidebarCollapsed(true);
  const handleRevealSidebar = () => setIsSidebarCollapsed(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar 
        isSidebarCollapsed={isSidebarCollapsed} 
        onCollapseSidebar={handleCollapseSidebar} 
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ChatHeader 
          isSidebarCollapsed={isSidebarCollapsed} 
          onRevealSidebar={handleRevealSidebar} 
        />
        {/* Inlined structure from the old CustomChatLayout */}
        <Box 
          className={styles["chat-layout-main-content"]} 
          // sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }} // Use SCSS or combine if needed
        >
          {children} {/* Page content goes here */}
        </Box>
        <Box 
          className={styles["chat-layout-input-panel-wrapper"]} 
          // sx={{ flexShrink: 0 }} // Use SCSS or combine if needed
        >
          <ChatInputPanel
            sessionId={currentChatId}
            modelConfig={modelConfig}
            isLoading={isChatComponentBusyFromStore || internalIsSubmitting}
            hitBottom={hitBottomFromStore}
            onSubmit={handleLayoutSubmit}
            scrollToBottom={scrollToBottomHandlerFromStore || (() => console.warn("ScrollToBottom handler not set in store") )}
            setShowPromptModal={showPromptModalHandlerFromStore || (() => console.warn("ShowPromptModal handler not set in store") )}
            setShowShortcutKeyModal={showShortcutKeyModalHandlerFromStore || (() => console.warn("ShowShortcutKeyModal handler not set in store") )}
          />
        </Box>
      </Box>
    </Box>
  );
} 