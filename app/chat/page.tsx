"use client";

import { useRouter } from "next/navigation";
import { useChatStore } from "@/app/store/chat"; // Assuming store path
import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Import the panel
import { Box, Typography } from "@mui/material";
import { useChatActions } from "@/app/hooks/useChatActions";

export default function NewChatPage() {
  const { newSession } = useChatActions();
  const router = useRouter();

  const startChat = async (input: string, images: string[]) => {
    if (!input || input.trim() === "") return;

    await newSession();

    const currentSession = useChatStore.getState().currentSession();

    if (!currentSession) {
      console.error(
        "[NewChatPage] Failed to retrieve current session after creation."
      );
      return;
    }

    // Store the initial message details in sessionStorage for the next page to pick up
    const newUserMessage = {
      input: input.trim(),
      images: images,
    };
    sessionStorage.setItem(currentSession.id, JSON.stringify(newUserMessage));

    router.replace(`/chat/${currentSession.id}`);
  };

  const dummyScrollToBottom = () => {};
  const dummySetShowPromptModal = () => {};
  const dummySetShowShortcutKeyModal = () => {};

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
          sessionId={undefined} // Pass undefined for session
          modelConfig={undefined} // Pass undefined for modelConfig
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
