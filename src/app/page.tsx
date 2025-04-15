'use client';

import { useState, useEffect } from 'react';
import { SimpleChat } from './components/SimpleChat';
import { LandingPage } from './components/LandingPage';
import { ClientApi, getClientApi } from './client/api';
import { ServiceProvider } from './constant';
import { Message, ChatConfig } from './types/chat';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let currentDelay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      
      // If we've reached max retries or it's not a rate limit error, throw
      if (retries >= maxRetries || !error.message?.includes('429')) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      currentDelay *= 2;
      console.log(`Rate limited. Retrying in ${currentDelay}ms (attempt ${retries}/${maxRetries})`);
      
      // Wait before retrying
      await delay(currentDelay);
    }
  }
}

// Debug function to log messages to console
function logMessages(messages: Message[], label: string = 'Current Messages') {
  console.group(label);
  console.table(messages.map((msg, index) => ({
    index,
    role: msg.role,
    text: msg.text,
    timestamp: new Date().toISOString()
  })));
  console.groupEnd();
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const chatConfig: ChatConfig = {
    serviceProvider: ServiceProvider.OpenAI,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    stream: true
  };

  const handleSendMessage = async (message: string) => {
    try {
      setError(null);
      
      // Add user message
      const userMessage: Message = {
        role: 'user',
        text: message
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Get AI response
      const api = getClientApi(chatConfig.serviceProvider);
      const response = await api.llm.chat({
        messages: messages.concat(userMessage).map(msg => ({
          role: msg.role,
          content: msg.text
        })),
        config: chatConfig,
        onUpdate: (text: string) => {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [...prev.slice(0, -1), { ...lastMessage, text }];
            }
            return [...prev, { role: 'assistant', text }];
          });
        },
        onFinish: () => {},
        onError: (err: Error) => {
          setError(err.message);
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleStart = (initialMessage: string) => {
    setIsStarted(true);
    handleSendMessage(initialMessage);
  };

  return (
    <div className="flex flex-col h-screen">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {!isStarted ? (
        <LandingPage onStart={handleStart} />
      ) : (
        <SimpleChat
          messages={messages}
          config={chatConfig}
          onSendMessage={handleSendMessage}
          onError={(error) => setError(error.message)}
        />
      )}
    </div>
  );
}
