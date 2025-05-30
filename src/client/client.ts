import {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  GetConversationMessagesParams,
  GetConversationsParams,
  Message,
  MessageCreateRequest,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  HTTPValidationError,
  EncryptedIdResponse,
  FileResponse,
  Summary,
  SummaryCreateRequest,
  SummaryResponse,
} from './types';
import { UUID } from 'crypto';
import { CustomizedPromptsData } from '@/types';

export interface CustomizedPromptsResponse extends CustomizedPromptsData {
  created_at: string;
  updated_at: string;
}

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

  async deleteMessages(conversationId: UUID, messageIds: UUID[]): Promise<DeleteMessagesResponse> {
    return this.request<DeleteMessagesResponse>('DELETE', `/conversations/${conversationId}/messages`, undefined, { message_ids: messageIds });
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

  async uploadFile(
    conversationId: UUID,
    file: File,
    fileName: string,
    fileSize: number,
    onUploadProgress?: (progress: number) => void
  ): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_size', fileSize.toString());
    formData.append('file_name', fileName);

    const xhr = new XMLHttpRequest();
    const abort = () => {
      xhr.abort();
    };

    const promise = new Promise<FileUploadResponseData>((resolve, reject) => {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onUploadProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const responseJson = JSON.parse(xhr.responseText);
            resolve(responseJson);
          } catch (e) {
            reject(new ApiError(xhr.status, "Failed to parse upload response", e));
          }
        } else {
          let errorBody;
          try {
            errorBody = JSON.parse(xhr.responseText);
          } catch (e) {
            errorBody = xhr.responseText;
          }
          reject(new ApiError(xhr.status, xhr.statusText || "Upload failed", errorBody));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError(0, "Network error during upload"));
      };

      xhr.onabort = () => {
        // Consider a specific error or simply a silent resolution
        // if abort is handled gracefully by the caller.
        // For now, let's treat it as a non-successful completion.
        reject(new ApiError(0, "Upload aborted by user"));
      };

      this.getAuthToken().then(token => {
        if (!token && this.requestRequiresAuth(true)) { // Assuming a helper or direct check
            reject(new ApiError(401, 'Authentication token not available for upload'));
            return;
        }
        
        const url = `${this.baseUrl}/conversations/${conversationId}/files`;
        xhr.open('POST', url, true);
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        // Do not set Content-Type for FormData, browser does it.
        xhr.send(formData);

      }).catch(authError => {
        reject(new ApiError(0, "Failed to get auth token for upload", authError));
      });
    });

    return promise.then(fileResponse => ({
      fileResponse,
      abort,
      xhr // Optionally expose xhr
    }));
  }

  // Helper to check if auth is typically required. 
  // You might have a more sophisticated way to determine this.
  private requestRequiresAuth(defaultValue: boolean = true): boolean {
    // Simple check, adjust based on your app's logic
    return defaultValue; 
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

  // --- Customized Prompts ---
  async getCustomizedPrompts(): Promise<CustomizedPromptsResponse> {
    return this.request<CustomizedPromptsResponse>('GET', '/me/customized-prompts');
  }

  async createCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsResponse> {
    return this.request<CustomizedPromptsResponse>('POST', '/me/customized-prompts', undefined, data);
  }

  async updateCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsResponse> {
    return this.request<CustomizedPromptsResponse>('PUT', '/me/customized-prompts', undefined, data);
  }

  async deleteCustomizedPrompts(): Promise<void> {
    await this.request<void>('DELETE', '/me/customized-prompts');
  }
} 