"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/app/store/chat"; // Assuming store path
// import ChatInput from "@/app/components/ChatInput"; // Remove simple input
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Import the panel
import { Box, Typography } from "@mui/material";
import { useApiClient } from "@/app/context/ApiProviderContext"; // <-- Import hook
import { useChatActions } from "@/app/hooks/useChatActions";
// import { Path } from "@/app/constant"; // Assuming constant path if needed for Path.Home
// import Locale from "@/app/locales"; // Assuming locales path if needed

export default function NewChatPage() {
  const chatStore = useChatStore();
  const { newSession, onUserInput } = useChatActions();
  const router = useRouter();
  const apiClient = useApiClient(); // <-- Use hook
  // const config = useAppConfig(); // If config is needed later
  // const pathname = usePathname(); // If pathname is needed later
  // startChat now needs to accept input and images, although images will be empty here
  const startChat = (input: string, images: string[]) => {
    if (!input || input.trim() === "") return; // Don't start if input is empty

    // 1. Create a new session (this likely selects it as the current one)
    newSession();

    // 2. Get the *current* session from the store *after* the update
    // Accessing state directly might be necessary if selectors don't update instantly
    const currentSession = useChatStore.getState().currentSession();

    if (!currentSession) {
      console.error(
        "[NewChatPage] Failed to retrieve current session after creation."
      );
      // Handle error, maybe show a message or redirect home
      // router.push(Path.Home);
      return;
    }

    // 3. Add the initial message to the current session
    // Pass both input and images (images will be empty array here)
    onUserInput(input.trim(), images);

    // 4. Navigate to the new session URL
    router.replace(`/chat/${currentSession.id}`);
  };

  // useCommand hook if needed for global commands - removed for simplicity now

  // Define dummy functions/values for props ChatInputPanel expects
  const dummyScrollToBottom = () => {};
  const dummySetShowPromptModal = () => {};
  const dummySetShowShortcutKeyModal = () => {};

  // useEffect(() => {
  //   const input = query.get("q");
  //   const images = query.getAll("image");
  //   if (input) {
  //     chatStore.newSession();
  //     // Pass apiClient to onUserInput
  //     chatStore.onUserInput(input.trim(), apiClient, images);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [apiClient]);

  // Basic structure for the new chat page
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        // Adjusted layout: Center content, push input to bottom
        justifyContent: "space-between", // Push title up, input down
        alignItems: "center",
      }}
    >
      {/* Optional Title - Ensure it doesn't overlap with input */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <Typography
          variant="h2"
          gutterBottom
          sx={{
            textAlign: "center",
            mt: 4,
            mb: "1.5rem", // Applied margin-bottom
            fontSize: "1.75rem", // Applied font-size
            fontWeight: "bold", // Applied font-weight
            color: "#333", // Applied color
          }}
        >
          {/* {Locale.NewChat.Title} */}
          How can I help you today?
        </Typography>
      </Box>

      {/* Input panel at the bottom */}
      {/* Ensure it takes full width within the main Box layout */}
      <Box sx={{ width: "100%", flexShrink: 0 }}>
        <ChatInputPanel
          session={undefined} // Pass undefined for session
          isLoading={false} // Not loading on this page
          hitBottom={true} // Assume we are at the bottom
          onSubmit={startChat} // Use the updated startChat
          scrollToBottom={dummyScrollToBottom} // Pass dummy function
          setShowPromptModal={dummySetShowPromptModal} // Pass dummy function
          setShowShortcutKeyModal={dummySetShowShortcutKeyModal} // Pass dummy function
        />
      </Box>
    </Box>
  );
}
