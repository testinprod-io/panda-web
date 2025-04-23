import { ServiceProvider } from '../constant';
import { ModelType } from '../store/config';
import { nanoid } from 'nanoid';
import { MultimodalContent } from "@/app/client/api";

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
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

export type MessageSyncState = 'synced' | 'pending_create' | 'error';

/**
* Represents a chat message with additional metadata
*/
export type ChatMessage = RequestMessage & {
 date: Date;
 streaming?: boolean;
 isError?: boolean;
 id: string;
 model?: ModelType;

 // --- NEW STATE FIELDS ---
 /** Tracks synchronization status of the message with the server */
 syncState?: MessageSyncState;
 // serverId?: UUID; // Optional: Can be used if we need to track both local and server ID separately
};

/**
* Creates a new chat message with the given overrides
* @param override - Partial message properties to override defaults
* @returns A new chat message
*/
export function createMessage(override: Partial<ChatMessage>): ChatMessage {
 return {
   id: nanoid(),
   date: new Date(),
   role: "user",
   content: "",
   syncState: 'pending_create',
   ...override,
 };
}

