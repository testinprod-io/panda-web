import { UUID } from "crypto";
import { Role } from "@/types";
import { ModelType } from "@/types/constant";
import { ChallengeResponse } from "@/client/platforms/panda-challenge";
import { CustomizedPromptsData } from "@/types";

export type GetAccessTokenFn = () => Promise<string | null>;


export type ChatModel = ModelType;

export interface MultimodalContent {
  type: "text" | "image_url" | "pdf_url";
  text?: string;
  image_url?: {
    url: string;
  };
  pdf_url?: {
    url: string;
  };
}

export interface RequestMessage {
  role: Role;
  content: string;
  attachments?: MultimodalContent[];
}

export interface LLMConfig {
  model: string;
  providerName?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  reasoning?: boolean;
  useSearch?: boolean;
  targetEndpoint?: string;
  customizedPrompts?: string;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;
  onReasoningStart?: (messageId?: string) => void;
  onReasoningChunk?: (messageId: string | undefined, chunk: string) => void;
  onReasoningEnd?: (messageId?: string) => void;
  onContentChunk?: (messageId: string | undefined, chunk: string) => void;
  onFinish: (message: string, date: Date, responseRes: Response, challengeResponse: ChallengeResponse) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export interface CustomizedPromptsResponse extends CustomizedPromptsData {
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface FileUploadResponseData {
  file_id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface DeleteMessagesResponse {
  deleted_count: number;
  failed_messages: Array<{
    message_id: UUID;
    reason: string;
    error_message: string;
  }>;
}

export interface UploadFileResponse {
  fileResponse: FileUploadResponseData;
  abort: () => void;
  xhr?: XMLHttpRequest; // Exposed for direct manipulation if needed, though abort() is preferred
}

export interface EventRecord {
  imr: number;
  event_type: number;
  digest: string;
  event: string;
  event_payload: string;
}

export interface AttestationResponse {
  quote: string;
  token: string;
  event_log: string;
}

export interface ServerModelInfo {
  name: string;
  model_name: string;
  description: string;
  url: string;
  supported_features: string[];
  max_context_length: number;
}

export interface InfoResponse {
  models: ServerModelInfo[];
}


export interface Conversation {
  title: string | null;
  conversation_id: UUID;
  created_at: string;
  updated_at: string;
  custom_data?: Record<string, any>;
}

export interface Message {
  sender_type: Role;
  content: string;
  message_id: UUID;
  conversation_id: UUID;
  files: FileInfo[];
  timestamp: string; // ISO Date string
  reasoning_content?: string;
  reasoning_time?: string;
  custom_data?: Record<string, any>;
  is_error: boolean;
  error_message?: string;
}

export interface InitialMessageContent {
  sender_type: Role;
  message_id: UUID;
  content: string;
}

export interface PaginationInfo {
  next_cursor: string | null;
  has_more: boolean;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface ConversationCreateRequest {
  title?: string | null;
  initial_messages?: InitialMessageContent[] | null;
  custom_data?: Record<string, any>;
}

export interface ConversationUpdateRequest {
  title: string;
  custom_data?: Record<string, any>;
}

export interface FileInfo {
  file_id: UUID;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface MessageCreateRequest {
  sender_type: Role;
  message_id: UUID;
  content: string;
  files: FileInfo[];
  reasoning_content?: string;
  reasoning_time?: string;
  custom_data?: Record<string, any>;
  is_error?: boolean;
  error_message?: string;
}

// Response Schemas

export interface PaginatedConversationsResponse {
  data: Conversation[];
  pagination: PaginationInfo;
}

export interface PaginatedMessagesResponse {
  data: Message[];
  pagination: PaginationInfo;
}

export interface GetConversationsParams {
  cursor?: string | null;
  limit?: number; // Default: 20, Max: 20
}

export interface GetConversationMessagesParams {
  cursor?: string | null;
  limit?: number; // Default: 20, Max: 200
}

export interface EncryptedIdResponse {
  user_id: string;
  encrypted_id: string;
  created_at: string;
  updated_at: string;
}

export interface FileResponse {
  file_id: UUID;
  conversation_id: UUID;
  file_type: "pdf" | "image";
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Summary {
  summary_id: UUID;
  conversation_id: UUID;
  start_message_id: UUID;
  end_message_id: UUID;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SummaryCreateRequest {
  start_message_id: UUID;
  end_message_id: UUID;
  content: string;
  timestamp?: string;
}

export interface SummaryResponse {
  data: Summary;
}
