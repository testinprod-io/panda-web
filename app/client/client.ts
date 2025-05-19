import {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  GetConversationMessagesParams,
  GetConversationsParams,
  HealthCheckResponse,
  Message,
  MessageCreateRequest,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  HTTPValidationError,
  EncryptedIdResponse,
  FileResponse,
  Summary,
  SummaryCreateRequest,
  SummaryResponse
} from './types';
import { UUID } from 'crypto';

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class ApiClient {
  private baseUrl: string;
  private getAuthToken: () => Promise<string | null>;

  constructor(baseUrl: string, getAuthToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
    this.getAuthToken = getAuthToken;
  }

  private async request<T>(
    method: string,
    path: string,
    queryParams?: Record<string, string | number | undefined | null>,
    body?: any,
    requiresAuth: boolean = true,
    isBinaryResponse: boolean = false
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: HeadersInit = {};

    // Only set Content-Type for JSON requests
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw new ApiError(401, 'Authentication token not available');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
      }
    }

    // --- Log Request Details --- 
    console.log(`[API Request] ${method} ${url.toString()}`);
    console.log('[API Request Headers]', JSON.stringify(headers, null, 2));
    if (options.body && !(body instanceof FormData)) {
        console.log('[API Request Body]', options.body);
    }
    // --- End Log Request Details ---

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch (e) {
          // Ignore if response body is not JSON
          errorBody = await response.text(); 
        }
        const errorMessage = (errorBody as HTTPValidationError)?.detail?.[0]?.msg || response.statusText || 'API request failed';
        throw new ApiError(response.status, errorMessage, errorBody);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
          return undefined as T;
      }

      // Handle binary responses
      if (isBinaryResponse) {
        return response as T;
      }

      return await response.json() as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error("Network or fetch error:", error);
        throw new ApiError(0, 'Network error or unable to reach API', error);
    }
  }

  // --- Health Check --- 
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('GET', '/health', undefined, undefined, false);
  }

  // --- Conversations --- 
  async getConversations(params?: GetConversationsParams): Promise<PaginatedConversationsResponse> {
    return this.request<PaginatedConversationsResponse>('GET', '/conversations', params as Record<string, string | number | undefined | null>);
  }

  async createConversation(data: ConversationCreateRequest): Promise<Conversation> {
    return this.request<Conversation>('POST', '/conversations', undefined, data);
  }

  async deleteConversations(): Promise<void> {
    await this.request<void>('DELETE', '/conversations');
  }

  async updateConversation(conversationId: UUID, data: ConversationUpdateRequest): Promise<Conversation> {
    return this.request<Conversation>('PUT', `/conversations/${conversationId}`, undefined, data);
  }

  async deleteConversation(conversationId: UUID): Promise<void> {
    await this.request<void>('DELETE', `/conversations/${conversationId}`);
  }

  // --- Messages --- 
  async getConversationMessages(conversationId: UUID, params?: GetConversationMessagesParams): Promise<PaginatedMessagesResponse> {
    return this.request<PaginatedMessagesResponse>('GET', `/conversations/${conversationId}/messages`, params as Record<string, string | number | undefined | null>);
  }

  async createMessage(conversationId: UUID, data: MessageCreateRequest): Promise<Message> {
    return this.request<Message>('POST', `/conversations/${conversationId}/messages`, undefined, data);
  }

  // --- Models ---
  // async getModels(): Promise<Model[]> {
  //   return this.request<Model[]>('GET', '/models');
  // }


// ---Encrypted ID---
  async getEncryptedId(): Promise<EncryptedIdResponse> {
    return this.request<EncryptedIdResponse>('GET', '/me/encrypted-id');
  }

  async createEncryptedId(encryptedId: string): Promise<EncryptedIdResponse> {
    return this.request<EncryptedIdResponse>('POST', '/me/encrypted-id', undefined, { encrypted_id: encryptedId });
  }

  // --- Files ---
  async getFile(conversationId: UUID, fileId: UUID): Promise<Response> {
    return this.request<Response>(
      'GET',
      `/conversations/${conversationId}/files/${fileId}`,
      undefined,
      undefined,
      true,
      true
    );
  }

  async uploadFile(conversationId: UUID, file: File): Promise<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request<FileResponse>(
      'POST',
      `/conversations/${conversationId}/files`,
      undefined,
      formData
    );
  }

  async deleteFile(conversationId: UUID, fileId: UUID): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/conversations/${conversationId}/files/${fileId}`
    );
  }

  // --- Summaries ---
  async getSummaries(conversationId: UUID): Promise<Summary[]> {
    return this.request<Summary[]>('GET', `/conversations/${conversationId}/summaries`);
  }

  async createSummary(conversationId: UUID, data: SummaryCreateRequest): Promise<SummaryResponse> {
    return this.request<SummaryResponse>('POST', `/conversations/${conversationId}/summaries`, undefined, data);
  }

  async deleteSummary(conversationId: UUID, summaryId: UUID): Promise<void> {
    await this.request<void>('DELETE', `/conversations/${conversationId}/summaries/${summaryId}`);
  }
} 