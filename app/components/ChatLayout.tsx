"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Sidebar from "@/app/components/sidebar";
import ChatHeader from "@/app/components/ChatHeader";
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel";
import { useChatStore, useAppConfig } from "@/app/store";
import { UNFINISHED_INPUT } from "@/app/constant";
import { safeLocalStorage } from "@/app/utils";
import { useChatActions } from "@/app/hooks/useChatActions";
import type { UUID } from "crypto"; // Keep as type import
import Locale from "@/app/locales";
import { useSnackbar } from "@/app/components/SnackbarProvider";
import styles from "@/app/components/chat/chat.module.scss";

const localStorage = safeLocalStorage();

export default function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile ? true : false);
  const params = useParams();
  const router = useRouter();
  const appConfig = useAppConfig();
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

  useEffect(() => {
    setIsSidebarCollapsed(isMobile ? true : false);
  }, [isMobile]);

  useEffect(() => {
    clearChatInteractionHandlers();
  }, [currentChatId, clearChatInteractionHandlers]);

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
      input: string,
      files: { url: string; fileId: string; type: string; name: string }[],
    ) => {
      if ((!input || !input.trim()) && files.length === 0) return;
      setInternalIsSubmitting(true);
      try {
        if (currentChatId && onSendMessageHandlerFromStore) {
          await onSendMessageHandlerFromStore(input, files);
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else {
          const createdSession = await newSession();
          if (createdSession) {
            const newUserMessage = { input: input.trim(), files };
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

  const handleCollapseSidebar = () => setIsSidebarCollapsed(true);
  const handleRevealSidebar = () => setIsSidebarCollapsed(false);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        position: "relative",
      }}
    >
      {isMobile ? (
        <>
          {!isSidebarCollapsed && (
            <Box
              onClick={handleCollapseSidebar}
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: theme.zIndex.drawer,
              }}
            />
          )}
          <Sidebar
            isSidebarCollapsed={isSidebarCollapsed}
            onCollapseSidebar={handleCollapseSidebar}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              width: '378px',
              transform: isSidebarCollapsed
                ? "translateX(-100%)"
                : "translateX(0)",
              transition: theme.transitions.create("transform", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              zIndex: theme.zIndex.drawer + 1,
              boxShadow: theme.shadows[3],
            }}
          />
        </>
      ) : (
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          onCollapseSidebar={handleCollapseSidebar}
        />
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
          isSidebarCollapsed={isSidebarCollapsed}
          onRevealSidebar={handleRevealSidebar}
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
              paddingTop: { xs: "60px", sm: "100px", md: "140px" },
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