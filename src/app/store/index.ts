export type ModelType = 'gpt-3.5-turbo' | 'gpt-4' | 'deepseek-chat' | 'deepseek-ai/deepseek-coder-1.3b-instruct' | 'deepseek-ai/deepseek-coder-6.7b-instruct' | 'deepseek-ai/deepseek-coder-33b-instruct';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
} 

export * from "./chat";
// export * from "./update";
export * from "./access";
export * from "./config";
// export * from "./plugin";
// export * from "./sd";
// export * from "./prompt";
// export * from "./sync";
// export * from "./mask";