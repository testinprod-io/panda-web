'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: uuidv4(),
      title: `New Chat ${chats.length + 1}`,
      messages: [{ role: 'assistant', text: 'Hello, how can I help you today?' }],
    };
    setChats((prev) => [...prev, newChat]);
    setActiveChat(newChat.id);
  };

  const handleSendMessage = (message: string) => {
    if (!activeChat) return;
    
    setChats((prev) => {
      return prev.map((chat) => {
        if (chat.id !== activeChat) return chat;
        
        // Add the user's message
        const userMessage: Message = { role: 'user', text: message };
        // Simulate an AI response
        const aiResponse: Message = { role: 'assistant', text: 'This is a simulated response.' };
        
        return {
          ...chat,
          messages: [...chat.messages, userMessage, aiResponse],
        };
      });
    });
  };

  const currentChat = chats.find((chat) => chat.id === activeChat);

  return (
    <div className="flex h-screen">
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onChatSelect={setActiveChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1">
        {currentChat ? (
          <Chat
            messages={currentChat.messages}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <button
              onClick={handleNewChat}
              className="bg-blue-500 text-white rounded-lg py-2 px-4 hover:bg-blue-600 transition-colors"
            >
              Start a new chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
