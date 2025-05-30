import { UUID } from "crypto";
import { useAppConfig } from "@/store/config";
import { ModelConfig } from "@/types/constant";
import { DEFAULT_TOPIC } from "@/store/chat";
import { ChatMessage } from "./chat";
import { Summary } from "@/client/types";

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
  visibleTopic: string;
  memoryPrompt: string;
  // messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  
  // maskAvatar: boolean;
  modelConfig: ModelConfig;
  // context: ChatMessage[];
  // hideContext: boolean;

  /** Tracks synchronization status of the entire session with the server */
  syncState: SessionSyncState;
  /** Tracks the loading state of messages from the server */
  messagesLoadState: MessagesLoadState;
  /** Stores the cursor for fetching next page of messages from server */
  serverMessagesCursor?: string;

  // Fields for chat history summarization
  // summaries: Summary[];
  lastSummarizedMessageId: UUID | null;
  isSummarizing: boolean;
}

export interface SubmittedFile {
  url: string;
  fileId: UUID;
  type: string;
  name: string;
  size: number;
}


export interface SessionState {
  userInput: string;
  persistedAttachedFiles: SubmittedFile[];
  enableSearch: boolean;
}

/**
 * Creates an empty chat session with default values
 * @returns A new empty chat session
 */
export function createNewSession(id: UUID): ChatSession {
  const now = Date.now();
  return {
    id: id,
    topic: "",
    visibleTopic: "",
    memoryPrompt: "",
    // messages: [],
    stat: { tokenCount: 0, wordCount: 0, charCount: 0 },
    lastUpdate: now,
    lastSummarizeIndex: 0,
    clearContextIndex: 0,
    // maskAvatar: false,
    // context: [],
    // hideContext: true,
    modelConfig: { ...useAppConfig.getState().modelConfig },
    syncState: SessionSyncState.LOCAL,
    messagesLoadState: MessagesLoadState.FULL,
    serverMessagesCursor: undefined,
    // Initialize summary fields
    // summaries: [],
    lastSummarizedMessageId: null,
    isSummarizing: false,
  };
}