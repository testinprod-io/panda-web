"use client";

import { MemoizedChatComponent } from "@/components/chat/ChatComponent";
import { UUID } from "crypto";

interface ChatContainerProps {
  _sessionId: UUID;
}

export function Chat(props: ChatContainerProps) {
  const { _sessionId } = props;

  if (!_sessionId) {
    return null;
  }

  return (
    <>
      <MemoizedChatComponent
        key={_sessionId}
        sessionId={_sessionId}
      />
    </>
  );
}
