'use client';

import { useRef, useEffect } from 'react';
import styles from './SimpleChat.module.scss';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { ChatProps } from '../types/chat';

export function SimpleChat({ messages, config, onSendMessage, onError }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        <ChatInput onSubmit={onSendMessage} />
      </div>
    </div>
  );
} 