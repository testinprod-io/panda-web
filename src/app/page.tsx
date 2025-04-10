'use client';

import { useState, useEffect } from 'react';
import { SimpleChat, Message } from './components/SimpleChat';
// import { v4 as uuidv4 } from 'uuid';  // We'll need this later for multiple chats
// import Sidebar from './components/sidebar';
// import Chat from './components/chat';
import { ClientApi, getClientApi } from './client/api';
import { ModelProvider, ServiceProvider } from './constant';

// For future multi-chat support
/*
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
*/

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
  // For future multi-chat support
  /*
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  */

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello, how can I help you today?' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log messages whenever they change
  useEffect(() => {
    logMessages(messages);
  }, [messages]);

  // Add a global debug function to access messages from console
  useEffect(() => {
    // @ts-ignore - Adding to window for debugging
    window.debugChat = {
      getMessages: () => {
        logMessages(messages, 'Debug: Current Messages');
        return messages;
      },
      clearMessages: () => {
        setMessages([{ role: 'assistant', text: 'Hello, how can I help you today?' }]);
        console.log('Messages cleared');
      },
      addTestMessage: (text: string) => {
        setMessages(prev => [...prev, { role: 'user', text }]);
        console.log(`Test message added: ${text}`);
      }
    };
    
    console.log('Debug tools available. Use window.debugChat.getMessages() to view messages');
    
    return () => {
      // @ts-ignore
      delete window.debugChat;
    };
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    // Add the user's message
    const userMessage: Message = { role: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);
    
    // Set loading state and clear any previous errors
    setIsLoading(true);
    setError(null);
    
    try {
      // Create API client
      const client = getClientApi(ServiceProvider.OpenAI);
      
      // Convert messages to format expected by API
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.text
      }));
      
      // Add the new user message
      chatMessages.push({
        role: 'user',
        content: message
      });
      
      // Log the messages being sent to the API
      console.log('Sending messages to API:', chatMessages);
      
      // Prepare for streaming response
      let responseText = '';
      
      // Call the API with streaming and retry mechanism
      await retryWithBackoff(async () => {
        await client.llm.chat({
          messages: chatMessages,
          config: {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            stream: true
          },
          onUpdate: (message, chunk) => {
            responseText = message;
            // Update UI with streaming response
            setMessages(prev => {
              const updatedMessages = [...prev];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              
              if (lastMessage.role === 'assistant') {
                lastMessage.text = responseText;
              } else {
                updatedMessages.push({ role: 'assistant', text: responseText });
              }
              
              return updatedMessages;
            });
          },
          onFinish: (message) => {
            // Only add a new message if we don't already have the assistant's response
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.role === 'assistant') {
                // Message already exists from streaming, just update it
                return prev.map((msg, i) => 
                  i === prev.length - 1 ? { ...msg, text: message } : msg
                );
              } else {
                // No assistant message yet, add it
                return [...prev, { role: 'assistant', text: message }];
              }
            });
            setIsLoading(false);
          },
          onError: (error) => {
            console.error('Chat error:', error);
            // Add error message to UI
            setMessages(prev => [
              ...prev,
              { role: 'assistant', text: 'Sorry, there was an error processing your request.' }
            ]);
            setIsLoading(false);
          }
        });
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Handle specific error types
      if (error.message?.includes('429')) {
        setError('Rate limit exceeded. Please try again in a few minutes.');
      } else if (error.message?.includes('401')) {
        setError('Authentication error. Please check your API key.');
      } else if (error.message?.includes('403')) {
        setError('Access forbidden. Your API key may not have permission for this model.');
      } else {
        setError('An error occurred while processing your request. Please try again.');
      }
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Sorry, there was an error processing your request.' }
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <SimpleChat
        messages={messages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
