import { ChatMessage } from "./chat";
import { ModelConfig } from "../store/config";
import { nanoid } from "nanoid";
import { DEFAULT_TOPIC } from "../store/chat";
import { useAppConfig } from "../store/config";
import { UUID } from "crypto";

export type SessionSyncState = 'synced' | 'pending_create' | 'pending_update' | 'error';
export type MessagesLoadState = 'none' | 'loading' | 'partial' | 'full' | 'error';

/**
 * Statistics for a chat session
 */
export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

/**
 * Represents a chat session with messages and configuration
 */
export interface ChatSession {
  id: string;
  conversationId?: UUID;
  topic: string;
  memoryPrompt: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  
  modelConfig: ModelConfig;
  context: ChatMessage[];
  hideContext: boolean;

  // --- NEW STATE FIELDS ---
  /** Tracks synchronization status of the session metadata (e.g., title) with the server */
  syncState?: SessionSyncState;
  /** Tracks the loading status of messages from the server for this session */
  messagesLoadState?: MessagesLoadState;
  /** Stores the pagination cursor received from the server for loading older messages */
  serverMessagesCursor?: string | null;
}

/**
 * Creates an empty chat session with default values
 * @returns A new empty chat session
 */
export function createEmptySession(): ChatSession {
  return {
    id: nanoid(),
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    messages: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: Date.now(),
    lastSummarizeIndex: 0,
    modelConfig: { ...useAppConfig.getState().modelConfig },
    context: [],
    hideContext: true,
    syncState: 'pending_create',
    messagesLoadState: 'none',
    serverMessagesCursor: null,
  };
}