import { ServiceProvider, ModelType } from "./constant";
import { nanoid } from "nanoid";
import { MultimodalContent, RequestMessage } from "@/client/api";
import { UUID } from "crypto";
import { FileInfo } from "@/client/types";
import { EncryptionService } from "../services/encryption-service";
import { ChallengeResponse } from "@/client/platforms/panda-challenge";

export enum Role {
  USER = "user",
  SYSTEM = "system",
  ASSISTANT = "assistant",
}

export interface Message {
  role: Role;
  text: string;
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
  SYNCED = "synced",
  PENDING_CREATE = "pending_create",
  ERROR = "error",
}

export interface CustomizedPromptsData {
  personal_info?: { [key: string]: string };
  prompts?: { [key: string]: string };
  enabled: boolean;
}

export function generateSystemPrompt(data: CustomizedPromptsData): string {
  const name = data.personal_info?.name || "User";
  const job = data.personal_info?.job || "individual";
  const traits = data.prompts?.traits || "Neutral";
  const extra = data.prompts?.extra_params || "";

  return `You are assisting ${name}, who is ${job}. When responding, adapt your tone and approach to suit someone who appreciates the following traits: ${traits}. ${extra.trim() ? `Also, ${extra}` : ""}`.trim();
}

export function encryptSystemPrompt(
  prompt: CustomizedPromptsData,
): CustomizedPromptsData {
  const encryptedPersonalInfo: { [key: string]: string } = {};
  if (prompt.personal_info) {
    for (const key in prompt.personal_info) {
      if (Object.prototype.hasOwnProperty.call(prompt.personal_info, key)) {
        encryptedPersonalInfo[key] = EncryptionService.encrypt(
          prompt.personal_info[key],
        );
      }
    }
  }

  const encryptedPrompts: { [key: string]: string } = {};
  if (prompt.prompts) {
    for (const key in prompt.prompts) {
      if (Object.prototype.hasOwnProperty.call(prompt.prompts, key)) {
        encryptedPrompts[key] = EncryptionService.encrypt(prompt.prompts[key]);
      }
    }
  }

  return {
    personal_info:
      Object.keys(encryptedPersonalInfo).length > 0
        ? encryptedPersonalInfo
        : undefined,
    prompts:
      Object.keys(encryptedPrompts).length > 0 ? encryptedPrompts : undefined,
    enabled: prompt.enabled,
  };
}

export function decryptSystemPrompt(
  prompt: CustomizedPromptsData,
): CustomizedPromptsData {
  const decryptedPersonalInfo: { [key: string]: string } = {};
  if (prompt.personal_info) {
    for (const key in prompt.personal_info) {
      if (Object.prototype.hasOwnProperty.call(prompt.personal_info, key)) {
        decryptedPersonalInfo[key] = EncryptionService.decrypt(
          prompt.personal_info[key],
        );
      }
    }
  }

  const decryptedPrompts: { [key: string]: string } = {};
  if (prompt.prompts) {
    for (const key in prompt.prompts) {
      if (Object.prototype.hasOwnProperty.call(prompt.prompts, key)) {
        decryptedPrompts[key] = EncryptionService.decrypt(prompt.prompts[key]);
      }
    }
  }

  return {
    personal_info:
      Object.keys(decryptedPersonalInfo).length > 0
        ? decryptedPersonalInfo
        : undefined,
    prompts:
      Object.keys(decryptedPrompts).length > 0 ? decryptedPrompts : undefined,
    enabled: prompt.enabled,
  };
}

/**
 * Represents a chat message with additional metadata
 * Content is assumed to be decrypted for temporary in-memory use (e.g., LLM calls)
 * but is NOT stored this way.
 */
export type ChatMessage = Omit<RequestMessage, "content"> & {
  // Omit original content
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
  challengeResponse?: ChallengeResponse;
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
  isError?: boolean; // Transient state, not persisted encrypted
};

/**
 * Creates a new chat message in its ENCRYPTED form suitable for storing.
 * Requires the caller to provide already encrypted content.
 * @param override - Partial message properties including encryptedContent
 * @returns A new EncryptedMessage
 */
export function createEncryptedMessage(
  override: Partial<EncryptedMessage> & { content: string },
): EncryptedMessage {
  const date = override.date instanceof Date ? override.date : new Date();

  return {
    id: override.id ?? nanoid(),
    role: override.role ?? Role.USER,
    date: date,
    syncState: override.syncState ?? MessageSyncState.PENDING_CREATE,
    content: override.content,
    model: override.model,
    streaming: override.streaming ?? false,
    isError: override.isError ?? false,
  };
}

/**
 * Creates a new chat message with the given overrides
 * @param override - Partial message properties to override defaults
 * @returns A new chat message
 */
export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  // Reverted signature to accept Partial<ChatMessage>
  return {
    id: crypto.randomUUID() as UUID,
    date: new Date(),
    role: Role.USER,
    files: [],
    streaming: false,
    isError: false,
    syncState: MessageSyncState.PENDING_CREATE,
    isReasoning: false,
    content: override.content ?? "",
    visibleContent: override.content ?? "",
    reasoning: override.reasoning ?? "",
    visibleReasoning: override.reasoning ?? "",
    useSearch: override.useSearch ?? false,
    ...override,
  };
}
