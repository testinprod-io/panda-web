"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  useMediaQuery,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import Sidebar from "@/components/sidebar/sidebar";
import ChatHeader from "@/components/chat/chat-header";

import { ChatInputPanel } from "@/components/chat/chat-input-panel";
import { useChatStore, useAppConfig } from "@/store";
import { UNFINISHED_INPUT } from "@/types/constant";
import { SessionState } from "@/types/session";
import { safeLocalStorage } from "@/utils/utils";
import { useChatActions } from "@/hooks/use-chat-actions";
import type { UUID } from "crypto"; // Keep as type import
import Locale from "@/locales";
import { useSnackbar } from "@/providers/snackbar-provider";
import styles from "@/components/chat/chat.module.scss";
import sidebarStyles from "@/components/sidebar/sidebar.module.scss";
import { usePrivy } from "@privy-io/react-auth";

const localStorage = safeLocalStorage();

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export default function ChatLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    isMobile ? true : false,
  );
  const params = useParams();
  const router = useRouter();
  const appConfig = useAppConfig();
  const prevIsMobile = usePrevious(isMobile);

  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();

  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  const onSendMessageHandlerFromStore = useChatStore(
    (state) => state.onSendMessageHandler,
  );
  const hitBottomFromStore = useChatStore((state) => state.hitBottom);
  const scrollToBottomHandlerFromStore = useChatStore(
    (state) => state.scrollToBottomHandler,
  );
  const showPromptModalHandlerFromStore = useChatStore(
    (state) => state.showPromptModalHandler,
  );
  const showShortcutKeyModalHandlerFromStore = useChatStore(
    (state) => state.showShortcutKeyModalHandler,
  );
  const isChatComponentBusyFromStore = useChatStore(
    (state) => state.isChatComponentBusy,
  );

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [contentOpacity, setContentOpacity] = useState(1);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  const currentChatId = params?.chatId as UUID | undefined;
  const isNewChatPage = !currentChatId;

  useEffect(() => {
    setContentOpacity(1);
    if (isNavigatingAway) {
      setIsNavigatingAway(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId]);

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
    async (sessionId: UUID | undefined, sessionState: SessionState) => {
      if (
        (!sessionState.userInput || !sessionState.userInput.trim()) &&
        sessionState.persistedAttachedFiles.length === 0
      )
        return;
      setInternalIsSubmitting(true);
      console.log(
        `[handleLayoutSubmit] sessionId: ${sessionId} currentChatId: ${currentChatId} onSendMessageHandlerFromStore: ${onSendMessageHandlerFromStore}`,
      );
      try {
        if (currentChatId && onSendMessageHandlerFromStore) {
          console.log(`[handleLayoutSubmit] currentChatId: ${currentChatId}`);
          await onSendMessageHandlerFromStore(sessionState);
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else if (sessionId) {
          const session = useChatStore
            .getState()
            .sessions.find((s) => s.id === sessionId);
          if (session) {
            console.log(`[handleLayoutSubmit] sessionId: ${sessionId}`);
            const newUserMessage = { sessionState };
            localStorage.setItem(session.id, JSON.stringify(newUserMessage));
            localStorage.removeItem(UNFINISHED_INPUT(session.id));
            setContentOpacity(0);
            setTimeout(() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(
                  "is_navigating_from_new_chat",
                  "true",
                );
              }
              router.replace(`/chat/${session.id}`);
            }, 400);
          } else {
            showSnackbar("Failed to start new chat", "error");
          }
        } else {
          const createdSession = await newSession(
            modelConfig,
            appConfig.customizedPrompts,
          );
          if (createdSession) {
            const newUserMessage = { sessionState };
            localStorage.setItem(
              createdSession.id,
              JSON.stringify(newUserMessage),
            );
            localStorage.removeItem(UNFINISHED_INPUT(createdSession.id));

            setIsNavigatingAway(true);
            setContentOpacity(0);

            setTimeout(() => {
              router.replace(`/chat/${createdSession.id}`);
            }, 400);
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
    ],
  );

  const handleToggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const sidebarExpandedWidth = 256;
  const sidebarCollapsedWidth = 80;
  const sidebarTransitionDuration = "0.4s";
  const sidebarTransitionTiming = "ease-in-out";

  let effectiveIsSidebarCollapsed = isSidebarCollapsed;
  if (isMobile && prevIsMobile === false && !isSidebarCollapsed) {
    effectiveIsSidebarCollapsed = true;
  }

  if (!privyReady) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
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
              <IconButton
                onClick={handleToggleSidebar}
                className={sidebarStyles.sidebarToggleButton}
                aria-label={
                  isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                }
                style={{
                  left: isSidebarCollapsed
                    ? `${sidebarCollapsedWidth - 16}px`
                    : `${sidebarExpandedWidth - 16}px`,
                  // transition: `left ${sidebarTransitionDuration} ${sidebarTransitionTiming}`,
                }}
              >
                {isSidebarCollapsed ? (
                  <img
                    src="/icons/chevron-right.svg"
                    style={{ width: "8.75px", height: "17.5px", filter: "invert(88%) sepia(27%) saturate(0%) hue-rotate(150deg) brightness(92%) contrast(83%)"}}
                    alt="Expand Sidebar"
                  />
                ) : (
                  <img
                    src="/icons/chevron-left.svg"
                    style={{ width: "8.75px", height: "17.5px", filter: "invert(88%) sepia(27%) saturate(0%) hue-rotate(150deg) brightness(92%) contrast(83%)" }}
                    alt="Collapse Sidebar"
                  />
                )}
              </IconButton>
          )}

          <>
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
                  visibility: !isSidebarCollapsed ? "visible" : "hidden",
                  transition: theme.transitions.create(
                    ["opacity", "visibility"],
                    {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.standard,
                    },
                  ),
                  zIndex: theme.zIndex.drawer,
                }}
              />
            )}
            <Sidebar
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              {...(isMobile && {
                sx: {
                  position: "fixed",
                  top: 0,
                  left: `-${sidebarExpandedWidth}px`,
                  height: "100vh",
                  width: `${sidebarExpandedWidth}px`,
                  transform: isSidebarCollapsed
                    ? "translateX(0)"
                    : "translateX(100%)",
                  transition: theme.transitions.create("transform", {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.standard,
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
          // flexGrow: 1,
          height: "100%",
          display: "flex",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            // background:
              // "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)",
            opacity: isNewChatPage && !isNavigatingAway ? 1 : 0,
            transition: isNavigatingAway ? "opacity 0.4s ease-in" : "none",
            zIndex: -1,
          },
        }}
      >
        <ChatHeader
          currentChatId={currentChatId}
          isSidebarCollapsed={effectiveIsSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          isMobile={isMobile}
        />
        <Box
          sx={{
            height: { xs: "calc(100% - 80px)", md: "calc(100% - 112px)" },
            width: "100%",
            paddingLeft: { xs: "5%", md: "max(calc((100% - 1200px) / 2), 15%)" },
            paddingRight: { xs: "5%", md: "max(calc((100% - 1200px) / 2), 15%)" },
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
        <Box
          className={
            !isNewChatPage ? styles["chat-layout-main-content"] : undefined
          }
          sx={{
            transition: isNavigatingAway ? "all 0.4s ease-in" : "none",
            opacity: contentOpacity,
            width: "100%",
            ...((isNewChatPage && !isNavigatingAway) && {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
              height: "20vh",
              // height: "35vh",
              marginBottom: { xs: "24px", md: "48px" },
              marginTop: "15vh",
            }),
            ...((!isNewChatPage || isNavigatingAway) && {
              height: "100%",
              marginTop: "0px",
            }),
          }}
        >
          {children}
        </Box>
        <Box
          className={styles["chat-layout-input-panel-wrapper"]}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            ...(isNewChatPage && {
              marginTop: { xs: "auto", sm: "0px" },
            }),
            ...(!isNewChatPage && {
              marginBottom: "0px",
              flexShrink: 0,
            }),
            marginBottom: "8px",
          }}
        >
          <ChatInputPanel
            sessionId={currentChatId}
            modelConfig={modelConfig}
            customizedPrompts={appConfig.customizedPrompts}
            isLoading={internalIsSubmitting}
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
        <Typography
          hidden={isMobile}
          sx={{
            minWidth: { xs: "auto", md: "460px" },
            textAlign: "center",
            color: "#646464",
            fontSize: "14px",
            fontFamily: "Inter",
            fontWeight: "400",
            lineHeight: "32px",
            wordWrap: "break-word",
            marginBottom: "16px",
            paddingLeft: "16px",
            paddingRight: "16px",
            boxSizing: "border-box",
          }}
        >
          {Locale.ChatLayout.Terms1}
          <a
            href="https://testinprod.notion.site/Panda-Alpha-Terms-of-Service-Privacy-Notice-2078fc57f54680349183dde6f0224da8"
            style={{
              color: "black",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            {Locale.ChatLayout.Terms2}
          </a>
          {Locale.ChatLayout.Terms3}
          <a
            href="https://testinprod.notion.site/Panda-Alpha-Terms-of-Service-Privacy-Notice-2078fc57f54680349183dde6f0224da8"
            style={{
              color: "black",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            {Locale.ChatLayout.Terms4}
          </a>
        </Typography>
        </Box>
      </Box>
      </Box>
    </Box>
  );
}
