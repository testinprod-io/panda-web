import { ServiceProvider } from '../constant';
import { ModelType } from '../store/config';
import { nanoid } from 'nanoid';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export interface RequestMessage {
  role: MessageRole;
  content: string;
}

export interface ChatConfig {
  serviceProvider: ServiceProvider;
  model: string;
  temperature?: number;
  stream?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ChatProps {
  messages: Message[];
  config: ChatConfig;
  onSendMessage: (message: string) => void;
  onError?: (error: Error) => void;
} 

/**
* Represents a tool that can be used by a chat message
*/
export type ChatMessageTool = {
 id: string;
 index?: number;
 type?: string;
 function?: {
   name: string;
   arguments?: string;
 };
 content?: string;
 isError?: boolean;
 errorMsg?: string;
};

/**
* Represents a chat message with additional metadata
*/
export type ChatMessage = RequestMessage & {
 date: string;
 streaming?: boolean;
 isError?: boolean;
 id: string;
 model?: ModelType;
 // tools?: ChatMessageTool[];
 // audio_url?: string;
 // isMcpResponse?: boolean;
};

/**
* Creates a new chat message with the given overrides
* @param override - Partial message properties to override defaults
* @returns A new chat message
*/
export function createMessage(override: Partial<ChatMessage>): ChatMessage {
 return {
   id: nanoid(),
   date: new Date().toLocaleString(),
   role: "user",
   content: "",
   ...override,
 };
}

