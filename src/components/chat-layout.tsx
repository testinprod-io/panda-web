"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/sidebar";
import ChatHeader from "@/components/chat-header";
import { ChatInputPanel } from "@/components/chat/chat-input-panel";
import { useChatStore, useAppConfig } from "@/store";
import { UNFINISHED_INPUT } from "@/types/constant";
import { SessionState } from "@/types/session";
import { safeLocalStorage } from "@/utils/utils";
import { useChatActions } from "@/hooks/use-chat-actions";
import type { UUID } from "crypto";
import Locale from "@/locales";
import { useSnackbar } from "@/providers/snackbar-provider";
import { usePrivy } from "@privy-io/react-auth";
import clsx from "clsx";

const localStorage = safeLocalStorage();

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined); // Explicitly initialize with undefined
  useEffect(() => {
    ref.current = value;
  }, [value]); // Update ref when value changes
  return ref.current; // This will return the value from the PREVIOUS render cycle
}

// Custom hook to simulate useMediaQuery with Tailwind breakpoints (approximate)
const useTailwindMediaQuery = (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const OBFUSCATED_MEDIA_QUERIES = {
      sm: '(min-width: 640px)',
      md: '(min-width: 768px)',
      lg: '(min-width: 1024px)',
      xl: '(min-width: 1280px)',
    };
    // For isMobile (down("md")), we check if it does NOT match md 
    const query = breakpoint === "md" ? '(max-width: 767px)' : OBFUSCATED_MEDIA_QUERIES[breakpoint];
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    listener(); // Initial check
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [breakpoint]);
  return matches;
};

// Icon Placeholders
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => <span className={clsx("inline-block text-xs p-0.5 border rounded", className)}>[{name}]</span>;
const ChevronLeftIconPlaceholder = () => <IconPlaceholder name="<" />;
const ChevronRightIconPlaceholder = () => <IconPlaceholder name=">" />;

export default function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const isMobile = useTailwindMediaQuery('md');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile ? true : false);
  const params = useParams();
  const router = useRouter();
  const appConfig = useAppConfig();
  const prevIsMobile = usePrevious(isMobile);
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();

  if (!privyReady) {
    return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Loading authentication...</p></div>;
  }

  if (!privyAuthenticated) {
    return <div className="flex justify-center items-center h-screen"><p className="text-lg text-gray-700">Please log in to access the chat.</p></div>;
  }

  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  const onSendMessageHandlerFromStore = useChatStore((state) => state.onSendMessageHandler);
  const hitBottomFromStore = useChatStore((state) => state.hitBottom);
  const scrollToBottomHandlerFromStore = useChatStore((state) => state.scrollToBottomHandler);
  const showPromptModalHandlerFromStore = useChatStore((state) => state.showPromptModalHandler);
  const showShortcutKeyModalHandlerFromStore = useChatStore((state) => state.showShortcutKeyModalHandler);
  const isChatComponentBusyFromStore = useChatStore((state) => state.isChatComponentBusy);
  const clearChatInteractionHandlers = useChatStore((state) => state.clearChatInteractionHandlers);

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);

  const currentChatId = params?.chatId as UUID | undefined;
  const isNewChatPage = !currentChatId;

  useEffect(() => {
    setIsSidebarCollapsed(isMobile ? true : false);
  }, [isMobile]);

  useEffect(() => {
    clearChatInteractionHandlers();
  }, [currentChatId, clearChatInteractionHandlers]);

  const modelConfig = React.useMemo(() => {
    if (currentChatId) {
      const session = useChatStore.getState().sessions.find((s) => s.id === currentChatId);
      return session?.modelConfig || appConfig.modelConfig;
    }
    return appConfig.modelConfig;
  }, [currentChatId, appConfig.modelConfig]);

  const handleLayoutSubmit = useCallback(
    async (
      sessionId: UUID | undefined,
      sessionState: SessionState
    ) => {
      if ((!sessionState.userInput || !sessionState.userInput.trim()) && sessionState.persistedAttachedFiles.length === 0) return;
      setInternalIsSubmitting(true);
      console.log(`[handleLayoutSubmit] sessionId: ${sessionId}`);
      try {
        if (currentChatId && onSendMessageHandlerFromStore) {
          console.log(`[handleLayoutSubmit] currentChatId: ${currentChatId}`);
          await onSendMessageHandlerFromStore(sessionState);
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else if (sessionId) {
          const session = useChatStore.getState().sessions.find((s) => s.id === sessionId);
          if (session) {
            console.log(`[handleLayoutSubmit] sessionId: ${sessionId}`);
            const newUserMessage = { sessionState };
            localStorage.setItem(
              session.id,
              JSON.stringify(newUserMessage)
            );
            localStorage.removeItem(UNFINISHED_INPUT(session.id));
            router.replace(`/chat/${session.id}`);
          } else {
            showSnackbar("Failed to start new chat", "error");
          }
        } else {
          const createdSession = await newSession();
          if (createdSession) {
            const newUserMessage = { sessionState };
            localStorage.setItem(
              createdSession.id,
              JSON.stringify(newUserMessage)
            );
            localStorage.removeItem(UNFINISHED_INPUT(createdSession.id));
            router.replace(`/chat/${createdSession.id}`);
          } else {
            showSnackbar("Failed to start new chat", "error");
          }
        }
      } catch (error) {
        showSnackbar(Locale.Store.Error, "error");
      } finally {
        setInternalIsSubmitting(false);
      }
    },
    [currentChatId, onSendMessageHandlerFromStore, newSession, router, showSnackbar]
  );

  const handleToggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const sidebarExpandedWidth = 378;
  const sidebarCollapsedWidth = 125;
  const sidebarTransitionDuration = "duration-300";
  const sidebarTransitionTiming = "ease-in-out";
  let effectiveIsSidebarCollapsed = isSidebarCollapsed;
  if (isMobile && prevIsMobile === false && !isSidebarCollapsed) {
    effectiveIsSidebarCollapsed = true;
  }

  return (
    <div className="flex h-screen relative bg-white overflow-hidden">
      {/* Sidebar Toggle Button - for Desktop */}
      {!isMobile && (
        <button 
          title={effectiveIsSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} 
          onClick={handleToggleSidebar} 
          aria-label={effectiveIsSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={clsx(
            "fixed top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-white border border-gray-300 shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400",
            sidebarTransitionDuration, sidebarTransitionTiming, "transition-[left]"
          )}
          style={{
            left: effectiveIsSidebarCollapsed ? `${sidebarCollapsedWidth - 16}px` : `${sidebarExpandedWidth - 16}px`,
          }}
        >
          {effectiveIsSidebarCollapsed ? <ChevronRightIconPlaceholder /> : <ChevronLeftIconPlaceholder />}
        </button>
      )}

      {/* Sidebar Component Area - Wrapped in a div for layout styling */}
      <div
        className={clsx(
            "z-20 h-full transition-all transform", 
            sidebarTransitionDuration, 
            sidebarTransitionTiming,
            isMobile ? "fixed bg-white border-r border-gray-200 shadow-xl" : "relative bg-gray-50 border-r border-gray-200",
            isMobile 
                ? (effectiveIsSidebarCollapsed ? "-translate-x-full" : "translate-x-0") 
                : (effectiveIsSidebarCollapsed ? `w-[${sidebarCollapsedWidth}px]` : `w-[${sidebarExpandedWidth}px]`),
            isMobile && effectiveIsSidebarCollapsed && "w-[280px]" // Ensure mobile hidden sidebar has a width for transition from an open state
        )}
      >
        <Sidebar 
          isSidebarCollapsed={effectiveIsSidebarCollapsed} 
          onToggleSidebar={handleToggleSidebar} 
        />
      </div>

      {/* Mobile Overlay for Sidebar */}
      {isMobile && !effectiveIsSidebarCollapsed && (
        <div 
          onClick={handleToggleSidebar} 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden transition-opacity duration-300 ease-in-out"
        />
      )}

      {/* Main Content Area */}
      <main 
        className={clsx(
            "flex-grow h-full flex flex-col transition-all overflow-hidden",
            sidebarTransitionDuration, 
            sidebarTransitionTiming,
            !isMobile && (effectiveIsSidebarCollapsed ? `ml-[${sidebarCollapsedWidth}px]` : `ml-[${sidebarExpandedWidth}px]`)
        )}
      >
        <ChatHeader 
          isSidebarCollapsed={effectiveIsSidebarCollapsed} 
          onToggleSidebar={handleToggleSidebar} 
          isMobile={isMobile} 
        />
        
        <div 
          className={clsx(
            "flex-grow w-full overflow-y-auto min-h-0",
            isNewChatPage && "flex flex-col items-center bg-gradient-to-b from-white via-gray-50 to-emerald-100 pt-10 md:pt-20"
          )}
        >
          {children} 
        </div>

        <div 
          className={clsx(
            "w-full flex justify-center shrink-0 bg-transparent",
            isNewChatPage ? "mt-auto pt-2 pb-4 md:pt-6 md:pb-8" : "py-2 md:py-4"
          )}
        >
          <ChatInputPanel
            sessionId={currentChatId}
            modelConfig={modelConfig}
            isLoading={isChatComponentBusyFromStore || internalIsSubmitting}
            hitBottom={hitBottomFromStore}
            onSubmit={handleLayoutSubmit}
            scrollToBottom={
              scrollToBottomHandlerFromStore ||
              (() => console.warn("ScrollToBottom handler not set in store"))
            }
            setShowPromptModal={
              showPromptModalHandlerFromStore ||
              (() => console.warn("ShowPromptModal handler not set in store"))
            }
            setShowShortcutKeyModal={
              showShortcutKeyModalHandlerFromStore ||
              (() => console.warn("ShowShortcutKeyModal handler not set in store"))
            }
          />
        </div>

        <p 
          className={clsx(
            "text-center text-xs text-gray-500 font-inter py-3 px-4 shrink-0",
            "md:text-sm md:leading-8"
          )}
        >
          By messaging Panda AI, you agree to our Terms and have read our Privacy Policy.
        </p>
      </main>
    </div>
  );
}