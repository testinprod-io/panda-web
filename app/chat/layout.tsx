"use client"; // Required for useState

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import { Box, Typography, useMediaQuery } from "@mui/material"; // Added Typography
import { useTheme } from "@mui/material/styles";
import Sidebar from "@/app/components/sidebar";
import ChatHeader from "@/app/components/ChatHeader";
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Import ChatInputPanel directly
import { useChatStore, useAppConfig } from "@/app/store";
import { UNFINISHED_INPUT } from "@/app/constant"; // For saving initial message
import { safeLocalStorage } from "@/app/utils";
import { useChatActions } from "@/app/hooks/useChatActions"; // For newSession
import { UUID } from "crypto";
import Locale from "@/app/locales"; // For snackbar messages
import { useSnackbar } from "@/app/components/SnackbarProvider"; // For snackbar
import styles from "@/app/components/chat/chat.module.scss"; // Import styles for layout classes

const localStorage = safeLocalStorage();

export default function RootChatGroupLayout({
  // Renamed for clarity
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Using 'sm' breakpoint for mobile

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Default to collapsed
  const params = useParams();
  const router = useRouter(); // For redirecting after new session
  const appConfig = useAppConfig();
  const { newSession } = useChatActions();
  const { showSnackbar } = useSnackbar();

  // Get interactive state from Zustand store
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

  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false); // For new chat submissions

  const currentChatId = params?.chatId as UUID | undefined;
  const isNewChatPage = !currentChatId; // Determine if it's the new chat page

  useEffect(() => {
    // Adjust sidebar collapsed state based on mobile status after initial mount
    // This prevents hydration mismatch if server-rendered differently
    setIsSidebarCollapsed(isMobile ? true : false);
  }, [isMobile]);

  useEffect(() => {
    // When the chat ID changes (i.e., navigating between different chat sessions or to/from new chat)
    // clear the handlers associated with the previous ChatComponent instance.
    // This is important because ChatComponent registers its specific handlers on mount/update.
    // If we navigate to a new chat, the old handlers should not persist.
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
  }, [currentChatId, appConfig.modelConfig, useChatStore.getState().sessions]); // Added sessions to dependency array

  const handleLayoutSubmit = useCallback(
    async (
      input: string,
      files: { url: string; fileId: string; type: string; name: string }[]
    ) => {
      if ((!input || !input.trim()) && files.length === 0) return;

      setInternalIsSubmitting(true);
      try {
        if (currentChatId && onSendMessageHandlerFromStore) {
          // Existing chat
          await onSendMessageHandlerFromStore(input, files);
          localStorage.removeItem(UNFINISHED_INPUT(currentChatId));
        } else {
          // New chat (currentChatId is undefined)
          console.log(
            "[RootChatGroupLayout] Starting new chat with:",
            input,
            files
          );
          const createdSession = await newSession();
          if (createdSession) {
            const newUserMessage = { input: input.trim(), files };
            localStorage.setItem(
              createdSession.id,
              JSON.stringify(newUserMessage)
            ); // For ChatComponent to pick up
            localStorage.removeItem(UNFINISHED_INPUT(createdSession.id));
            router.replace(`/chat/${createdSession.id}`);
          } else {
            console.error(
              "[RootChatGroupLayout] Failed to create new session."
            );
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
    [
      currentChatId,
      onSendMessageHandlerFromStore,
      newSession,
      router,
      showSnackbar,
    ] // Removed modelConfig dependency as it's not directly used here for submission logic itself
  );

  const handleCollapseSidebar = () => setIsSidebarCollapsed(true);
  const handleRevealSidebar = () => setIsSidebarCollapsed(false);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        position: "relative" /* Added for potential absolute children */,
      }}
    >
      {isMobile ? (
        <>
          {!isSidebarCollapsed && (
            <Box // Backdrop
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
            // isMobileMode={isMobile} // Prop to inform Sidebar it's in mobile mode
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              width: 280, // Standard width for mobile drawer
              transform: isSidebarCollapsed
                ? "translateX(-100%)"
                : "translateX(0)",
              transition: theme.transitions.create("transform", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              zIndex: theme.zIndex.drawer + 1,
              // backgroundColor: theme.palette.background.paper, // REMOVED to use SCSS background
              boxShadow: theme.shadows[3], // Add shadow for overlay effect
            }}
          />
        </>
      ) : (
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          onCollapseSidebar={handleCollapseSidebar}
          // sx prop here could define desktop-specific styles if Sidebar doesn't handle collapse internally well
        />
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100%", // Ensure main content area takes full height
          display: "flex",
          flexDirection: "column",
          ...(isNewChatPage && {
            background:
              "linear-gradient(177deg, white 0%, #FEFEFE 27%, #F6FFFC 75%, #DAF7EF 100%)",
          }),
          // On mobile, this Box will not be pushed by the fixed sidebar
        }}
      >
        <ChatHeader
          isSidebarCollapsed={isSidebarCollapsed}
          onRevealSidebar={handleRevealSidebar}
          isMobile={isMobile} // Pass isMobile to ChatHeader
        />

        {/* Children (page content) wrapper */}
        <Box
          className={
            !isNewChatPage ? styles["chat-layout-main-content"] : undefined
          }
          sx={{
            width: "100%", // Take full width within the gradient container
            ...(isNewChatPage && {
              display: "flex",
              flexDirection: "column",
              alignItems: "center", // Center the Welcome content from app/chat/page.tsx
              paddingTop: { xs: "60px", sm: "100px", md: "140px" }, // Space above Welcome content
              flexShrink: 0, // Welcome content shouldn't grow, its size is fixed
            }),
            // For existing chats, styles["chat-layout-main-content"] provides flexGrow:1 and overflowY:'auto'
            ...(!isNewChatPage &&
              {
                // flexGrow: 1, // Ensure it takes available space for chat messages
                // overflowY: 'auto',
                // position: 'relative'
              }),
          }}
        >
          {children}{" "}
          {/* Page content goes here (Welcome text or Chat messages) */}
        </Box>

        {/* ChatInputPanel wrapper */}
        <Box
          className={styles["chat-layout-input-panel-wrapper"]}
          sx={{
            width: "100%", // Wrapper takes full width to center its child
            display: "flex", // To center ChatInputPanel
            justifyContent: "center", // To center ChatInputPanel
            ...(isNewChatPage && {
              // Styles for the new chat page input panel "card"
              // maxWidth: { xs: 'calc(100% - 32px)', sm: '608px', md: '992px' }, // Responsive max width from Figma
              // minWidth: { xs: 'calc(100% - 32px)', sm: 'auto', md: '608px' }, // Responsive min width
              // padding: '16px', // Figma's padding for the card
              // background: 'white', // Figma's card background
              // boxShadow: '0px 2px 7px rgba(0, 0, 0, 0.20)', // Figma's shadow
              // borderRadius: '24px', // Figma's border radius
              // border: '1px solid #CACACA', // Figma's outline (approximated with border)
              marginTop: { xs: "24px", md: "48px" }, // Spacer 1 from Figma (responsive)
              // marginBottom: '8px', // Gap before Terms text from Figma
              // boxSizing: 'border-box',
            }),
            // For existing chats, styles["chat-layout-input-panel-wrapper"] provides flexShrink:0
            ...(!isNewChatPage && {
              flexShrink: 0,
              // marginBottom
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
            // Pass a prop to ChatInputPanel if its internal styling/placeholder needs to change for new chat page
            // isNewChatPageLayout={isNewChatPage} // Example prop
          />
        </Box>

        {/* "By messaging Panda AI..." text, only for new chat page */}
        <Typography
          sx={{
            minWidth: { xs: "auto", md: "460px" }, // Min width from Figma
            textAlign: "center",
            color: "#646464", // Figma style
            fontSize: "14px", // Figma style. Assuming 1rem = 16px
            fontFamily: "Inter", // Figma style
            fontWeight: "400", // Figma style
            lineHeight: "32px", // Figma style
            wordWrap: "break-word",
            marginTop: "8px", // Margin is handled by InputPanel's marginBottom
            marginBottom: "16px", // Spacer 2 from Figma (responsive)
            paddingLeft: "16px", // Ensure text doesn't touch edges on small screens
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
