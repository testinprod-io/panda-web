"use client";

// Removed useRouter from here as it's handled by ChatLayout for new chat submission
// import { useRouter } from "next/navigation";
// import { useChatStore } from "@/app/store/chat"; // Not directly needed here anymore
// import { ChatInputPanel } from "@/app/components/chat/ChatInputPanel"; // Moved to ChatLayout
import { Box, Typography } from "@mui/material";
// import { useChatActions } from "@/app/hooks/useChatActions"; // Handled by ChatLayout
// import { ChatLayout } from "@/app/components/chat/ChatLayout"; // REMOVED: No longer needed
// import { useAppConfig } from "@/app/store"; // Not directly needed if ChatLayout is gone
// import { useState } from "react"; // REMOVED: Not needed for isBusy

export default function NewChatPage() {
  // const { newSession } = useChatActions(); // Now handled by ChatLayout
  // const router = useRouter(); // Now handled by ChatLayout
  // const appConfig = useAppConfig(); // REMOVED
  // const [isBusy, setIsBusy] = useState(false); // REMOVED

  // Dummy handlers are no longer relevant here as this page doesn't render ChatLayout or ChatInputPanel
  // const dummyScrollToBottom = () => {};
  // const dummySetShowPromptModal = () => {};
  // const dummySetShowShortcutKeyModal = () => {};

  // This page now just renders its content. 
  // app/chat/layout.tsx will provide the surrounding layout including ChatInputPanel.
  return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%", // Ensure it takes full height within its parent container in the layout
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
  );
}
