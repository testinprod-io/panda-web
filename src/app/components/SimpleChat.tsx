'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import styles from './SimpleChat.module.scss';
import { ChatMessage } from '../store';
import { ClientApi, getClientApi } from '../client/api';
import { Message as MessageType, ChatProps } from '../types/chat';
import { Message } from './Message';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function SimpleChat({ messages, config, onSendMessage, onError }: ChatProps) {
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
  const convertToChatMessages = (msgs: MessageType[]): ChatMessage[] => {
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
    
    try {
      onSendMessage(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      onError?.(error as Error);
    } finally {
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
    <div className={styles['chat-container']}>
      <div className={styles['messages-container']}>
        {messages.map((message, index) => (
          <Message
            key={index}
            content={message.text}
            isUser={message.role === 'user'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles['input-container']}>
        <div className={styles['input-wrapper']}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
} 