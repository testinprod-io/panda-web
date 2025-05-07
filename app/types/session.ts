import { UUID } from "crypto";
import { ModelConfig, useAppConfig } from "../store/config";
import { DEFAULT_TOPIC } from "../store/chat";
import { ChatMessage } from "./chat";

export enum SessionSyncState {
  SYNCED = 'synced',
  PENDING_CREATE = 'pending_create',
  PENDING_UPDATE = 'pending_update',
  PENDING_DELETE = 'pending_delete',
  ERROR = 'error',
  LOCAL = 'local',
}

export enum MessagesLoadState {
  NONE = 'none',
  LOADING = 'loading',
  PARTIAL = 'partial',
  FULL = 'full',
  ERROR = 'error',
}

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
  id: UUID;
  topic: string;
  memoryPrompt: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  
  maskAvatar: boolean;
  modelConfig: ModelConfig;
  context: ChatMessage[];
  hideContext: boolean;

  /** Tracks synchronization status of the entire session with the server */
  syncState: SessionSyncState;
  /** Tracks the loading state of messages from the server */
  messagesLoadState: MessagesLoadState;
  /** Stores the cursor for fetching next page of messages from server */
  serverMessagesCursor?: string;
}

/**
 * Creates an empty chat session with default values
 * @returns A new empty chat session
 */
export function createNewSession(id: UUID): ChatSession {
  const now = Date.now();
  return {
    id: id,
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    messages: [],
    stat: { tokenCount: 0, wordCount: 0, charCount: 0 },
    lastUpdate: now,
    lastSummarizeIndex: 0,
    clearContextIndex: 0,
    maskAvatar: false,
    context: [],
    hideContext: true,
    modelConfig: { ...useAppConfig.getState().modelConfig },
    syncState: SessionSyncState.LOCAL,
    messagesLoadState: MessagesLoadState.FULL,
    serverMessagesCursor: undefined,
  };
}