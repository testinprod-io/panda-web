"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, easing, Typography, useMediaQuery, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import Sidebar from "@/components/sidebar/sidebar";
import ChatHeader from "@/components/chat/chat-header";

import { ChatInputPanel } from "@/components/chat/chat-input-panel";
import { useChatStore, useAppConfig } from "@/store";
import { UNFINISHED_INPUT } from "@/types/constant";
import { SessionState, SubmittedFile } from "@/types/session";
import { safeLocalStorage } from "@/utils/utils";
import { useChatActions } from "@/hooks/use-chat-actions";
import type { UUID } from "crypto"; // Keep as type import
import Locale from "@/locales";
import { useSnackbar } from "@/providers/snackbar-provider";
import styles from "@/components/chat/chat.module.scss";
import sidebarStyles from "@/components/sidebar/sidebar.module.scss";
import { usePrivy } from "@privy-io/react-auth";

const localStorage = safeLocalStorage();

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined); // Explicitly initialize with undefined
  useEffect(() => {
    ref.current = value;
  }, [value]); // Update ref when value changes
  return ref.current; // This will return the value from the PREVIOUS render cycle
}

export default function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile ? true : false);
  const params = useParams();
  const router = useRouter();
  const appConfig = useAppConfig();
  const prevIsMobile = usePrevious(isMobile); // Track previous isMobile state

  // Get Privy status
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();

  // Hooks MUST be called unconditionally at the top level.
  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  const onSendMessageHandlerFromStore = useChatStore(
    (state) => state.onSendMessageHandler
  );
  const hitBottomFromStore = useChatStore((state) => state.hitBottom);
  const scrollToBottomHandlerFromStore = useChatStore(
    (state) => state.scrollToBottomHandler
  );
  const showPromptModalHandlerFromStore = useChatStore(
    (state) => state.showPromptModalHandler
  );
  const showShortcutKeyModalHandlerFromStore = useChatStore(
    (state) => state.showShortcutKeyModalHandler
  );
  const isChatComponentBusyFromStore = useChatStore(
    (state) => state.isChatComponentBusy
  );
  const clearChatInteractionHandlers = useChatStore(
    (state) => state.clearChatInteractionHandlers
  );

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);

  const currentChatId = params?.chatId as UUID | undefined;
  const isNewChatPage = !currentChatId;


  // If Privy is ready but the user is not authenticated,
  // ChatLayoutContent will still render its basic structure.
  // Components inside it that require auth (like Sidebar) will be conditionally rendered.

  // If we've reached this point, privyReady is true. privyAuthenticated may be true or false.

  useEffect(() => {
    setIsSidebarCollapsed(isMobile ? true : false);
  }, [isMobile]);

  const modelConfig = React.useMemo(() => {
    if (currentChatId) {
      const session = useChatStore
        .getState()
        .sessions.find((s) => s.id === currentChatId);
      return session?.modelConfig || appConfig.modelConfig;
    }
    return appConfig.modelConfig;
  }, [currentChatId, appConfig.modelConfig, useChatStore]);

  const handleLayoutSubmit = useCallback(
    async (
      sessionId: UUID | undefined,
      sessionState: SessionState
    ) => {
      if ((!sessionState.userInput || !sessionState.userInput.trim()) && sessionState.persistedAttachedFiles.length === 0) return;
      setInternalIsSubmitting(true);
      console.log(`[handleLayoutSubmit] sessionId: ${sessionId} currentChatId: ${currentChatId} onSendMessageHandlerFromStore: ${onSendMessageHandlerFromStore}`);
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
    [
      currentChatId,
      onSendMessageHandlerFromStore,
      newSession,
      router,
      showSnackbar,
    ]
  );

  const handleToggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  const sidebarExpandedWidth = 300; // px - Matches $sidebar-expanded-width
  const sidebarCollapsedWidth = 125; // px - Matches $sidebar-collapsed-width
  const sidebarTransitionDuration = "0.4s"; // Matches $sidebar-transition-duration
  const sidebarTransitionTiming = "ease-in-out"; // Matches $sidebar-transition-timing

  // Determine the effective collapsed state for the sidebar, 
  // especially to prevent flicker when transitioning from desktop (open) to mobile (overlay).
  let effectiveIsSidebarCollapsed = isSidebarCollapsed;
  if (isMobile && prevIsMobile === false && !isSidebarCollapsed) {
    // Transitioning from desktop (prevIsMobile was false) to mobile (isMobile is true)
    // AND the sidebar was open on desktop (isSidebarCollapsed was false at the start of this render).
    // Force collapse for this specific transition render to avoid flicker.
    effectiveIsSidebarCollapsed = true;
  }

  if (!privyReady) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress color="primary" /></Box>;
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        position: "relative",
      }}
    >
      {privyAuthenticated && (
        <>
      {!isMobile && (
        <Tooltip title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} placement="right">
          <IconButton 
            onClick={handleToggleSidebar} 
            className={sidebarStyles.sidebarToggleButton} // Use styles from sidebar.module.scss
            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{
              left: isSidebarCollapsed ? `${sidebarCollapsedWidth-20}px` : `${sidebarExpandedWidth-20}px`,
              transition: `left ${sidebarTransitionDuration} ${sidebarTransitionTiming}`,
              // top: '50vh' and transform will be handled by SCSS
            }}
          >
            {isSidebarCollapsed ? <img src="/icons/chevron-right.svg" style={{ width: '8.75px', height: '17.5px' }} alt="Expand Sidebar" /> : <img src="/icons/chevron-left.svg" style={{ width: '8.75px', height: '17.5px' }}  alt="Collapse Sidebar" />}
          </IconButton>
        </Tooltip>
      )}

      {/* Logic for overlay and sidebar rendering */}
      <>
        {/* Render overlay if mobile, control visibility/opacity with sx props for animation */}
        {isMobile && (
          <Box
            onClick={handleToggleSidebar}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              opacity: !isSidebarCollapsed ? 1 : 0,
              visibility: !isSidebarCollapsed ? 'visible' : 'hidden',
              transition: theme.transitions.create(["opacity", "visibility"], { // Apply transition to opacity and visibility
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard,
              }),
              zIndex: theme.zIndex.drawer,
            }}
          />
        )}
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed} // Use effective state
          onToggleSidebar={handleToggleSidebar} // Pass the new toggle handler
          {...(isMobile && {
            sx: {
              position: "fixed",
              top: 0,
              left: `-${sidebarExpandedWidth}px`,
              height: "100vh",
              width: `${sidebarExpandedWidth}px`,
              transform: isSidebarCollapsed // Use state for transform
                ? "translateX(0)"      // Stays at -378px (hidden)
                : "translateX(100%)",  // Moves to 0px (visible)
              transition: theme.transitions.create("transform", { // Apply transition to transform property
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard, // Use standard duration for both enter and exit
              }),
              zIndex: theme.zIndex.drawer + 1,
              boxShadow: theme.shadows[3],
            },
          })}
        />
      </>
      </>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          ...(isNewChatPage && {
            background:
              "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)",
          }),
        }}
      >
        <ChatHeader
          isSidebarCollapsed={effectiveIsSidebarCollapsed} // Use effective state
          onToggleSidebar={handleToggleSidebar} // Pass the new toggle handler
          isMobile={isMobile}
        />
        <Box
          className={
            !isNewChatPage ? styles["chat-layout-main-content"] : undefined
          }
          sx={{
            width: "100%",
            ...(isNewChatPage && {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              // paddingTop: { xs: "60px", sm: "100px", md: "140px" },
              flexShrink: 0,
            }),
            ...(!isNewChatPage && {}),
          }}
        >
          {children}
        </Box>
        <Box
          className={styles["chat-layout-input-panel-wrapper"]}
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            ...(isNewChatPage && {
              marginTop: { xs: "24px", md: "48px" },
            }),
            ...(!isNewChatPage && {
               flexShrink: 0,
            }),
          }}
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
              (() =>
                console.warn("ShowShortcutKeyModal handler not set in store"))
            }
          />
        </Box>
        
           <Typography
            sx={{
              minWidth: { xs: "auto", md: "460px" },
              textAlign: "center",
              color: "#646464",
              fontSize: "14px",
              fontFamily: "Inter", 
              fontWeight: "400",
              lineHeight: "32px",
              wordWrap: "break-word",
              marginTop: "8px",
              marginBottom: "16px",
              paddingLeft: "16px",
              paddingRight: "16px",
              boxSizing: "border-box",
            }}
          >
            By messaging Panda AI, you agree to our Terms and have read our
            Privacy Policy.
          </Typography>
      </Box>
    </Box>
  );
}
