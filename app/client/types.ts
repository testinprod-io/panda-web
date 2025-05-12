import { UUID } from 'crypto';

// Base Schemas from OpenAPI spec

export enum SenderTypeEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface Conversation {
  title: string | null;
  conversation_id: UUID;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
}

export interface Message {
  sender_type: SenderTypeEnum;
  content: string;
  message_id: UUID;
  conversation_id: UUID;
  timestamp: string; // ISO Date string
}

export interface InitialMessageContent {
    sender_type: SenderTypeEnum;
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

// Request Body Schemas

export interface ConversationCreateRequest {
  title?: string | null;
  initial_messages?: InitialMessageContent[] | null;
}

export interface ConversationUpdateRequest {
  title: string;
}

export interface MessageCreateRequest {
  sender_type: SenderTypeEnum;
  message_id: UUID;
  content: string;
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

// Generic Response for Health Check (simplified)
export interface HealthCheckResponse {
    success: boolean;
    message: string;
    data?: Record<string, any> | null;
}

// API Client Method Parameter Types

export interface GetConversationsParams {
    cursor?: string | null;
    limit?: number; // Default: 20, Max: 20
}

export interface GetConversationMessagesParams {
    cursor?: string | null;
    limit?: number; // Default: 20, Max: 30
} 