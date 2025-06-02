import { UUID } from "crypto";
import { useAppConfig } from "@/store/config";
import { ModelConfig } from "@/types/constant";

export enum SessionSyncState {
  SYNCED = "synced",
  PENDING_CREATE = "pending_create",
  PENDING_UPDATE = "pending_update",
  PENDING_DELETE = "pending_delete",
  ERROR = "error",
  LOCAL = "local",
}

export enum MessagesLoadState {
  NONE = "none",
  LOADING = "loading",
  PARTIAL = "partial",
  FULL = "full",
  ERROR = "error",
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
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;

  modelConfig: ModelConfig;
  customizedPrompts?: string;

  syncState: SessionSyncState;
  messagesLoadState: MessagesLoadState;
  serverMessagesCursor?: string;

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
    stat: { tokenCount: 0, wordCount: 0, charCount: 0 },
    lastUpdate: now,
    lastSummarizeIndex: 0,
    clearContextIndex: 0,
    modelConfig: { ...useAppConfig.getState().modelConfig },
    syncState: SessionSyncState.LOCAL,
    messagesLoadState: MessagesLoadState.FULL,
    serverMessagesCursor: undefined,
    lastSummarizedMessageId: null,
    isSummarizing: false,
  };
}
