"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  useMediaQuery,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Sidebar from "@/components/sidebar/sidebar";
import ChatHeader from "@/components/chat/chat-header";
import { ChatInputPanel } from "@/components/chat/chat-input-panel";
import { UNFINISHED_INPUT } from "@/types/constant";
import { SessionState } from "@/types/session";
import { safeLocalStorage } from "@/utils/utils";
import type { UUID } from "crypto";
import Locale from "@/locales";
import { useSnackbar } from "@/providers/snackbar-provider";
import styles from "@/components/chat/chat.module.scss";
import sidebarStyles from "@/components/sidebar/sidebar.module.scss";
import { usePrivy } from "@privy-io/react-auth";
import { usePandaSDK } from "@/providers/sdk-provider";
import { Chat } from "@/sdk/Chat";
import { useConfig } from "@/sdk/hooks";
import { ServerModelInfo } from "@/sdk/client";
import { PandaConfig } from "@/sdk/ConfigManager";

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
    isMobile ? true : false
  );
  const params = useParams();
  const router = useRouter();
  const pandaConfig = useConfig();
  const prevIsMobile = usePrevious(isMobile);
  const { sdk } = usePandaSDK();
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const [isSDKReady, setIsSDKReady] = useState(sdk.ready);
  const [modelConfig, setModelConfig] = useState<ServerModelInfo | undefined>(
    pandaConfig.defaultModel
  );

  useEffect(() => {
    const unsubscribe = sdk.bus.on("sdk.ready", (isReady) => {
      setIsSDKReady(isReady);
    });
    return unsubscribe;
  }, [sdk.bus]);

  const { showSnackbar } = useSnackbar();

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [contentOpacity, setContentOpacity] = useState(1);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  const currentChatId = params?.chatId as UUID | undefined;
  const isNewChatPage = !currentChatId;

  useEffect(() => {
    const updateModelConfig = async () => {
      if (currentChatId) {
        // For existing chats, get the chat-specific model or fall back to global default
        const chat = await sdk.chat.getChat(currentChatId);
        if (chat?.defaultModelName) {
          const chatModel = pandaConfig.models.find(
            (m) => m.model_name === chat.defaultModelName
          );
          if (chatModel) {
            setModelConfig(chatModel);
            return;
          }
        }
      }
      // For new chats or when chat doesn't have a specific model, use global default
      setModelConfig(pandaConfig.defaultModel);
    };

    updateModelConfig();
  }, [currentChatId, sdk.chat, pandaConfig.defaultModel, pandaConfig.models]);

  // Listen for chat updates to handle model changes made in the header
  useEffect(() => {
    if (!currentChatId) return;

    const chatUpdateEventName = `chat.updated:${currentChatId}` as const;
    const unsubscribe = sdk.bus.on(chatUpdateEventName, async () => {
      const chat = await sdk.chat.getChat(currentChatId);
      if (chat?.defaultModelName) {
        const chatModel = pandaConfig.models.find(
          (m) => m.model_name === chat.defaultModelName
        );
        if (chatModel && chatModel.model_name !== modelConfig?.model_name) {
          setModelConfig(chatModel);
        }
      }
    });

    return unsubscribe;
  }, [
    currentChatId,
    sdk.bus,
    sdk.chat,
    pandaConfig.models,
    modelConfig?.model_name,
  ]);

  // Listen for global config updates when on new chat page (no currentChatId)
  useEffect(() => {
    if (currentChatId) return; // Only listen when on new chat page

    const unsubscribe = sdk.bus.on(
      "config.updated",
      (data: { config: PandaConfig }) => {
        const newDefaultModel = data.config.defaultModel;
        if (
          newDefaultModel &&
          newDefaultModel.model_name !== modelConfig?.model_name
        ) {
          setModelConfig(newDefaultModel);
        }
      }
    );

    return unsubscribe;
  }, [currentChatId, sdk.bus, modelConfig?.model_name]);

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

  const handleLayoutSubmit = useCallback(
    async (sessionId: UUID | undefined, sessionState: SessionState) => {
      if (
        (!sessionState.userInput || !sessionState.userInput.trim()) &&
        sessionState.persistedAttachedFiles.length === 0
      )
        return;
      setInternalIsSubmitting(true);
      try {
        let chat: Chat | undefined;
        if (currentChatId && sdk.chat.activeChat?.id === currentChatId) {
          chat = await sdk.chat.getChat(currentChatId);
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else if (sessionId) {
          chat = await sdk.chat.getChat(sessionId);
          if (chat?.id) {
            localStorage.removeItem(UNFINISHED_INPUT(sessionId));
            setContentOpacity(0);
            setTimeout(() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem(
                  "is_navigating_from_new_chat",
                  "true"
                );
              }
              router.replace(`/chat/${chat!.id}`);
            }, 400);
          }
        } else {
          if (!modelConfig) {
            showSnackbar("Models are not loaded yet.", "error");
            setInternalIsSubmitting(false);
            return;
          }
          chat = await sdk.chat.createNewChat(
            Locale.Store.DefaultTopic,
            modelConfig,
            pandaConfig.customizedPrompts
          );

          if (chat) {
            localStorage.removeItem(UNFINISHED_INPUT(chat.id));

            setIsNavigatingAway(true);
            setContentOpacity(0);

            setTimeout(() => {
              router.replace(`/chat/${chat!.id}`);
            }, 400);
          } else {
            showSnackbar("Failed to start new chat", "error");
          }
        }
        if (chat) {
          chat.sendMessage(
            sessionState.userInput,
            sessionState.persistedAttachedFiles,
            {
              enableSearch: sessionState.enableSearch,
              onSuccess: () => {
                setInternalIsSubmitting(false);
              },
              onFailure: (error: Error) => {
                showSnackbar(Locale.Store.Error, "error");
                setInternalIsSubmitting(false);
              },
            }
          );
        } else {
          setInternalIsSubmitting(false);
        }
      } catch (error) {
        showSnackbar(Locale.Store.Error, "error");
        setInternalIsSubmitting(false);
      }
    },
    [
      currentChatId,
      router,
      pandaConfig,
      showSnackbar,
      modelConfig,
      sdk.chat,
    ]
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

  if (!privyReady || !sdk.initialized || (privyAuthenticated && !isSDKReady)) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100dvh",
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
              }}
            >
              {isSidebarCollapsed ? (
                <img
                  src="/icons/chevron-right.svg"
                  style={{
                    width: "8.75px",
                    height: "17.5px",
                    filter:
                      "invert(88%) sepia(27%) saturate(0%) hue-rotate(150deg) brightness(92%) contrast(83%)",
                  }}
                  alt="Expand Sidebar"
                />
              ) : (
                <img
                  src="/icons/chevron-left.svg"
                  style={{
                    width: "8.75px",
                    height: "17.5px",
                    filter:
                      "invert(88%) sepia(27%) saturate(0%) hue-rotate(150deg) brightness(92%) contrast(83%)",
                  }}
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
                    }
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
                  height: "100dvh",
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
            paddingLeft: {
              xs: "5%",
              md: "max(calc((100% - 1200px) / 2), 15%)",
            },
            paddingRight: {
              xs: "5%",
              md: "max(calc((100% - 1200px) / 2), 15%)",
            },
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
              ...(isNewChatPage &&
                !isNavigatingAway && {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "20vh",
                  minHeight: "0px",
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
              flexShrink: 0,
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
              customizedPrompts={pandaConfig.customizedPrompts}
              isLoading={internalIsSubmitting}
              onSubmit={handleLayoutSubmit}
            />
            <Typography
              hidden={isMobile}
              sx={{
                minWidth: { xs: "auto", md: "460px" },
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontFamily: "Inter",
                fontWeight: "400",
                lineHeight: "32px",
                wordWrap: "break-word",
                marginBottom: "16px",
                paddingLeft: "16px",
                paddingRight: "16px",
                boxSizing: "border-box",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              {Locale.ChatLayout.Terms1}
              <a
                href="https://testinprod.notion.site/Panda-Alpha-Terms-of-Service-Privacy-Notice-2078fc57f54680349183dde6f0224da8"
                style={{
                  color: "var(--text-primary)",
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
                  color: "var(--text-primary)",
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
