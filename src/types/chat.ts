import { ServiceProvider } from "./constant";
import { MultimodalContent, RequestMessage } from "@/sdk/client/";
import { UUID } from "crypto";
import { FileInfo } from "@/sdk/client/types";
import { ChallengeResponse } from "@/sdk/client/panda-challenge";

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

export async function encryptSystemPrompt(
  prompt: CustomizedPromptsData,
  encryptFunction: (text: string) => Promise<string>,
): Promise<CustomizedPromptsData> {
  const encryptedPersonalInfo: { [key: string]: string } = {};
  if (prompt.personal_info) {
    for (const key in prompt.personal_info) {
      if (Object.prototype.hasOwnProperty.call(prompt.personal_info, key)) {
        encryptedPersonalInfo[key] = await encryptFunction(
          prompt.personal_info[key],
        );
      }
    }
  }

  const encryptedPrompts: { [key: string]: string } = {};
  if (prompt.prompts) {
    for (const key in prompt.prompts) {
      if (Object.prototype.hasOwnProperty.call(prompt.prompts, key)) {
        encryptedPrompts[key] = await encryptFunction(prompt.prompts[key]);
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

export async function decryptSystemPrompt(
  prompt: CustomizedPromptsData,
  decryptFunction: (text: string) => Promise<string>,
): Promise<CustomizedPromptsData> {
  const decryptedPersonalInfo: { [key: string]: string } = {};
  if (prompt.personal_info) {
    for (const key in prompt.personal_info) {
      if (Object.prototype.hasOwnProperty.call(prompt.personal_info, key)) {
        decryptedPersonalInfo[key] = await decryptFunction(
          prompt.personal_info[key],
        );
      }
    }
  }

  const decryptedPrompts: { [key: string]: string } = {};
  if (prompt.prompts) {
    for (const key in prompt.prompts) {
      if (Object.prototype.hasOwnProperty.call(prompt.prompts, key)) {
        decryptedPrompts[key] = await decryptFunction(prompt.prompts[key]);
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
 * Process events from LLM server for search and PDF processing
 */
export interface ProcessEvent {
  object: "process.event";
  type: "search" | "pdf";
  id: string;
  message: string;
  data: {
    query?: string;
    urls?: string[];
    [key: string]: any;
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
  errorMessage?: string;
  id: UUID;
  model?: string;
  syncState: MessageSyncState;
  reasoning?: string; // Add reasoning field
  visibleReasoning?: string;
  reasoningTime?: number; // Add reasoning duration field
  isReasoning?: boolean; // To track if the message is currently in reasoning phase
  useSearch: boolean; // To track if the message is using search
  processEvents?: ProcessEvent[]; // Add process events field
  challengeResponse?: ChallengeResponse;
};

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
    model: override.model ?? "",
    content: override.content ?? "",
    visibleContent: override.content ?? "",
    reasoning: override.reasoning ?? "",
    visibleReasoning: override.reasoning ?? "",
    useSearch: override.useSearch ?? false,
    processEvents: [],
    ...override,
  };
}
