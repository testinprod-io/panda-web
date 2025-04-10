export type ModelType = 'gpt-3.5-turbo' | 'gpt-4' | 'deepseek-chat';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
} 