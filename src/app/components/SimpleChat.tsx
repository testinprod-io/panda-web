'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import styles from './SimpleChat.module.scss';
import { ChatMessage, ModelType } from '../store';
import { ClientApi, getClientApi } from '../client/api';
import { ModelProvider, ServiceProvider } from '../constant';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface SimpleChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function SimpleChat({ messages, onSendMessage }: SimpleChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRequestTimeRef = useRef<number>(0);
  
  // Debug: Log component props and state changes
  useEffect(() => {
    console.log('SimpleChat: Messages updated', messages);
  }, [messages]);
  
  useEffect(() => {
    console.log('SimpleChat: Loading state changed', isLoading);
  }, [isLoading]);
  
  // Convert SimpleChat messages to ChatMessage format for API
  const convertToChatMessages = (msgs: Message[]): ChatMessage[] => {
    return msgs.map(msg => ({
      role: msg.role,
      content: msg.text,
      timestamp: Date.now()
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Debug: Log send action
    console.log('SimpleChat: Sending message', input);
    
    // Implement rate limiting - ensure at least 1 second between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < 1000) {
      console.log(`SimpleChat: Rate limiting, waiting ${1000 - timeSinceLastRequest}ms`);
      await delay(1000 - timeSinceLastRequest);
    }
    lastRequestTimeRef.current = Date.now();
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    // Add user message to UI immediately
    onSendMessage(userMessage);
    
    try {
      // Create API client
      const client = getClientApi(ServiceProvider.OpenAI);
      
      // Convert messages to format expected by API
      const chatMessages = convertToChatMessages([
        ...messages,
        { role: 'user', text: userMessage }
      ]);
      
      // Prepare for streaming response
      let responseText = '';
      
      // Call the API with streaming
      await client.llm.chat({
        messages: chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          stream: true
        },
        onUpdate: (message, chunk) => {
          responseText = message;
          // Update UI with streaming response
          // This would require a more complex state management approach
          // For simplicity, we'll just update the last message
          const updatedMessages = [...messages, { role: 'user', text: userMessage }];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.text = responseText;
          } else {
            updatedMessages.push({ role: 'assistant', text: responseText });
          }
          // This is a simplified approach - in a real app you'd use proper state management
          // setMessages(updatedMessages);
        },
        onFinish: (message) => {
          // Add assistant response to UI
          const updatedMessages = [...messages, 
            { role: 'user', text: userMessage },
            { role: 'assistant', text: message }
          ];
          // This is a simplified approach - in a real app you'd use proper state management
          // setMessages(updatedMessages);
          setIsLoading(false);
        },
        onError: (error) => {
          console.error('Chat error:', error);
          // Add error message to UI
          const updatedMessages = [...messages, 
            { role: 'user', text: userMessage },
            { role: 'assistant', text: 'Sorry, there was an error processing your request.' }
          ];
          // This is a simplified approach - in a real app you'd use proper state management
          // setMessages(updatedMessages);
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask me anything"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
} 