"use client";

// Removed useRouter from here as it's handled by ChatLayout for new chat submission
// import { useRouter } from "next/navigation";
// import { useChatStore } from "@/app/store/chat"; // Not directly needed here anymore
// import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Moved to ChatLayout
import { Box, Typography } from "@mui/material";
// import { useChatActions } from "@/app/hooks/useChatActions"; // Handled by ChatLayout
import { ChatLayout } from "@/app/components/chat/ChatLayout"; // Import the new layout
import { useAppConfig } from "@/app/store"; // To get default model config
import { useState } from "react"; // Import useState for isBusyUpstream if dynamic changes are ever needed

export default function NewChatPage() {
  // const { newSession } = useChatActions(); // Now handled by ChatLayout
  // const router = useRouter(); // Now handled by ChatLayout
  const appConfig = useAppConfig();
  // For NewChatPage, isBusyUpstream is likely always false as there's no complex child component processing
  // However, including it for consistency and if future needs arise.
  const [isBusy, setIsBusy] = useState(false); 

  // Dummy handlers for ChatLayout when no active ChatComponent is present
  const dummyScrollToBottom = () => {};
  const dummySetShowPromptModal = () => {};
  const dummySetShowShortcutKeyModal = () => {};

  return (
    // For the new chat page, onSendMessage is omitted (or undefined) 
    // so ChatLayout uses its own new session creation logic.
    // hitBottom is true by default, scrollToBottom and modal setters are dummies.
    <ChatLayout 
      sessionId={undefined} 
      modelConfig={appConfig.modelConfig}
      hitBottom={true} // Default to true, no scrollable content yet
      scrollToBottom={dummyScrollToBottom}
      setShowPromptModal={dummySetShowPromptModal}
      setShowShortcutKeyModal={dummySetShowShortcutKeyModal}
      isBusyUpstream={isBusy} // Pass the state here
      // onSendMessage is not provided, ChatLayout handles new chat creation
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          p: 3,
        }}
      >
        <Typography
          variant="h2"
          gutterBottom
          sx={{
            fontSize: "1.75rem",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          How can I help you today?
        </Typography>
      </Box>
    </ChatLayout>
  );
}
