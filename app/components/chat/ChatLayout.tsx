"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppConfig, useChatStore } from "@/app/store";
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel";
import { UNFINISHED_INPUT } from "@/app/constant";
import { safeLocalStorage } from "@/app/utils";
import { useChatActions } from "@/app/hooks/useChatActions";
import { UUID } from "crypto";
import { ModelConfig } from "@/app/store";
import { useSnackbar } from "@/app/components/SnackbarProvider";
import Locale from "@/app/locales";

import styles from "./chat.module.scss";

const localStorage = safeLocalStorage();

interface ChatLayoutProps {
  children: React.ReactNode;
  sessionId: UUID | undefined;
  modelConfig?: ModelConfig;
  onSendMessage?: (input: string, images: string[]) => Promise<void>;
  hitBottom: boolean;
  scrollToBottom: () => void;
  setShowPromptModal: () => void;
  setShowShortcutKeyModal: () => void;
  isBusyUpstream?: boolean;
}

export function ChatLayout({
  children,
  sessionId: initialSessionId,
  modelConfig: initialModelConfig,
  onSendMessage,
  hitBottom,
  scrollToBottom,
  setShowPromptModal,
  setShowShortcutKeyModal,
  isBusyUpstream = false,
}: ChatLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const appConfig = useAppConfig();
  const chatStore = useChatStore();
  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  const [currentSessionId, setCurrentSessionId] = useState<UUID | undefined>(initialSessionId);
  const [currentModelConfig, setCurrentModelConfig] = useState<ModelConfig | undefined>(() => {
    if (initialSessionId) {
      const session = chatStore.sessions.find(s => s.id === initialSessionId);
      return session?.modelConfig || appConfig.modelConfig;
    }
    return initialModelConfig || appConfig.modelConfig;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const newActiveChatId = params?.chatId as UUID | undefined;
    setCurrentSessionId(newActiveChatId);

    if (newActiveChatId) {
      const session = chatStore.sessions.find(s => s.id === newActiveChatId);
      setCurrentModelConfig(session?.modelConfig || appConfig.modelConfig);
    } else {
      setCurrentModelConfig(initialModelConfig || appConfig.modelConfig);
    }
  }, [params?.chatId, chatStore.sessions, appConfig.modelConfig, initialSessionId]);

  const handleChatSubmit = useCallback(
    async (input: string, images: string[]) => {
      if ((!input || !input.trim()) && images.length === 0) return;
      
      setIsSubmitting(true);
      try {
        if (currentSessionId && onSendMessage) {
          await onSendMessage(input, images);
          localStorage.removeItem(UNFINISHED_INPUT(currentSessionId));
        } else {
          console.log("[ChatLayout] Starting new chat with:", input, images);
          const createdSession = await newSession(); 
          if (createdSession) {
            const newUserMessage = { input: input.trim(), images };
            localStorage.setItem(createdSession.id, JSON.stringify(newUserMessage));
            localStorage.removeItem(UNFINISHED_INPUT(createdSession.id)); 
            router.replace(`/chat/${createdSession.id}`);
          } else {
            console.error("[ChatLayout] Failed to create new session.");
            showSnackbar("Failed to start new chat", "error");
          }
        }
      } catch (error) {
          console.error("[ChatLayout] Error during submission:", error);
          showSnackbar(Locale.Store.Error, "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentSessionId, onSendMessage, newSession, router, showSnackbar, appConfig.modelConfig]
  );
  
  return (
    <div className={styles["chat-layout-container"]}>
      <div className={styles["chat-layout-main-content"]}>
        {children}
      </div>
      <div className={styles["chat-layout-input-panel-wrapper"]}>
        <ChatInputPanel
          sessionId={currentSessionId}
          modelConfig={currentModelConfig}
          isLoading={isBusyUpstream || isSubmitting} 
          hitBottom={hitBottom} 
          onSubmit={handleChatSubmit}
          scrollToBottom={scrollToBottom} 
          setShowPromptModal={setShowPromptModal} 
          setShowShortcutKeyModal={setShowShortcutKeyModal}
        />
      </div>
    </div>
  );
}

// Add some basic styling for the layout if not reusing chat.module.scss directly for layout structure
// For example, in your scss file:
// .chat-layout-container {
//   display: flex;
//   flex-direction: column;
//   height: 100vh; // Or 100% if parent has height
// }
// .chat-layout-main-content {
//   flex-grow: 1;
//   overflow-y: auto; // If content scrolls independently
// }
// .chat-layout-input-panel-wrapper {
//   flex-shrink: 0; // Prevent input panel from shrinking
// } 