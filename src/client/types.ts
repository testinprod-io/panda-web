import { UUID } from "crypto";
import { Role } from "@/types";

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
