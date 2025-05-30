import { ServiceProvider, ModelType } from './constant';
// import { ModelType } from '../store/config';
import { nanoid } from 'nanoid';
import { MultimodalContent } from "@/client/api";
import { UUID } from "crypto";
import { FileInfo } from '@/client/types';

export enum Role {
  USER = 'user',
  SYSTEM = 'system',
  ASSISTANT = 'assistant',
}

export interface Message {
  role: Role;
  text: string;
}

export interface RequestMessage {
  role: Role;
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

export enum MessageSyncState {
  SYNCED = 'synced',
  PENDING_CREATE = 'pending_create',
  ERROR = 'error',
}

/**
 * Represents a chat message with additional metadata
 * Content is assumed to be decrypted for temporary in-memory use (e.g., LLM calls)
 * but is NOT stored this way.
 */
export type ChatMessage = Omit<RequestMessage, 'content'> & { // Omit original content
  content: string; // Allow MultimodalContent[]
  visibleContent: string;
  attachments?: MultimodalContent[];
  files: FileInfo[];  
  date: Date;
  streaming: boolean;
  isError: boolean;
  id: UUID;
  model?: ModelType;
  syncState: MessageSyncState;
  reasoning?: string; // Add reasoning field
  visibleReasoning?: string;
  reasoningTime?: number; // Add reasoning duration field
  isReasoning?: boolean; // To track if the message is currently in reasoning phase
  useSearch: boolean; // To track if the message is using search
};

/**
 * Represents the structure stored in IndexedDB.
 * Content is always stored encrypted.
 */
export type EncryptedMessage = {
  id: string;
  role: Role;
  /** Encrypted representation of string | MultimodalContent[] */
  content: string;
  date: Date;
  model?: ModelType;
  syncState?: MessageSyncState;
  // Fields needed for UI rendering/state, but not encrypted
  streaming?: boolean; // Transient state, not persisted encrypted
  isError?: boolean;   // Transient state, not persisted encrypted
};

/**
* Creates a new chat message in its ENCRYPTED form suitable for storing.
* Requires the caller to provide already encrypted content.
* @param override - Partial message properties including encryptedContent
* @returns A new EncryptedMessage
*/
export function createEncryptedMessage(override: Partial<EncryptedMessage> & { content: string }): EncryptedMessage {
  // Ensure required fields are present or defaulted
  const date = override.date instanceof Date ? override.date : new Date();

  return {
    id: override.id ?? nanoid(),
    role: override.role ?? Role.USER,
    date: date,
    syncState: override.syncState ?? MessageSyncState.PENDING_CREATE,
    content: override.content, // Mandatory
    model: override.model,
    streaming: override.streaming ?? false, // Default transient states
    isError: override.isError ?? false,
  };
}

/**
* Creates a new chat message with the given overrides
* @param override - Partial message properties to override defaults
* @returns A new chat message
*/
export function createMessage(override: Partial<ChatMessage>): ChatMessage { // Reverted signature to accept Partial<ChatMessage>
 return {
   id: crypto.randomUUID() as UUID,
   date: new Date(),
   role: Role.USER, 
   files: [],
   streaming: false,
   isError: false,
   syncState: MessageSyncState.PENDING_CREATE,
   isReasoning: false, // Initialize isReasoning
   content: override.content ?? "",
   visibleContent: override.content ?? "",
   reasoning: override.reasoning ?? "",
   visibleReasoning: override.reasoning ?? "",
   useSearch: override.useSearch ?? false,
   ...override, // Use override directly
 };
}

