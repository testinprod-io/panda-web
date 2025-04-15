'use client';

import { useEffect, useState } from 'react';
import { Chat } from './chat';
import { ChatProps } from '../types/chat';
import { useChatStore, ChatSession, ChatMessage } from '../store/chat';
import { useAppConfig } from '../store/config';
import { useAccessStore } from '../store/access';
import { ServiceProvider } from '../constant';

export function ChatWrapper({ messages, config, onSendMessage, onError }: ChatProps) {
  // Initialize stores
  const chatStore = useChatStore();
  const configStore = useAppConfig();
  const accessStore = useAccessStore();
  
  // Set up the chat session
  useEffect(() => {
    // Clear any existing sessions
    chatStore.clearSessions();
    
    // Create a new session
    const session = chatStore.currentSession();
    
    // Update the session with the current messages
    chatStore.updateTargetSession(session, (session: ChatSession) => {
      session.messages = messages.map(msg => ({
        id: `msg-${Math.random().toString(36).substring(2, 9)}`,
        role: msg.role,
        content: msg.text,
        date: new Date().toLocaleString(),
      }));
    });
    
    // Update the model config
    chatStore.updateTargetSession(session, (session: ChatSession) => {
      session.modelConfig = {
        ...session.modelConfig,
        model: config.model,
        providerName: config.serviceProvider as ServiceProvider,
        temperature: config.temperature || 0.7,
      };
    });
    
    // Set up the API key if needed
    if (config.serviceProvider === ServiceProvider.OpenAI) {
      accessStore.update((access: any) => {
        access.openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
      });
    }
    
    // Override the onUserInput method to use our onSendMessage
    const originalOnUserInput = chatStore.onUserInput;
    chatStore.onUserInput = async (content: string) => {
      try {
        await onSendMessage(content);
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    };
    
    // Clean up function to restore original method
    return () => {
      chatStore.onUserInput = originalOnUserInput;
    };
  }, []);
  
  // Update the app config
  useEffect(() => {
    // Set the theme to light
    configStore.update((config) => {
      config.theme = 'light';
    });
    
    // Set the font size
    configStore.update((config) => {
      config.fontSize = 14;
    });
    
    // Set the submit key
    configStore.update((config) => {
      config.submitKey = 'Enter';
    });
  }, []);
  
  return (
    <div className="h-full w-full">
      <Chat />
    </div>
  );
} 