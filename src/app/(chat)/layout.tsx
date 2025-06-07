import ChatLayoutContent from "@/components/chat/chat-layout";
import React from "react";

export default function ChatPagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ChatLayoutContent>{children}</ChatLayoutContent>;
}