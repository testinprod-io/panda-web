export type ModelType = 'gpt-3.5-turbo' | 'gpt-4' | 'deepseek-chat' | 'deepseek-ai/deepseek-coder-1.3b-instruct' | 'deepseek-ai/deepseek-coder-6.7b-instruct' | 'deepseek-ai/deepseek-coder-33b-instruct';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
} 