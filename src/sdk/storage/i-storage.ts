import { ServerModelInfo, Summary, Conversation, ConversationUpdateRequest, SummaryCreateRequest } from "@/sdk/client/types";
import { Chat } from "@/sdk/Chat";
import { ChatMessage, CustomizedPromptsData } from "@/types";
import { UUID } from "crypto";

export interface PaginatedConversations {
  conversations: Conversation[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface PaginatedSummaries {
  summaries: Summary[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface IStorage {
  /*  Chats  */
  listChats(cursor?: string, limit?: number): Promise<PaginatedConversations>;
  getChat(id: string): Promise<Conversation | undefined>;
  createChat(
    title: string,
    customData?: Record<string, any>,
  ): Promise<Conversation>;
  updateChat(
    chatId: string,
    data: Partial<ConversationUpdateRequest>,
  ): Promise<void>;
  deleteChat(id: string): Promise<void>;
  deleteAllChats(): Promise<void>;

  /*  Messages  */
  listMessages(
    chatId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedMessages>;
  saveMessage(chatId: string, msg: ChatMessage): Promise<void>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  deleteMessages(chatId: string, messageIds: string[]): Promise<void>;

  /*  Summaries  */
  getSummaries(chatId: string): Promise<Summary[]>;
  saveSummary(chatId: string, summary : SummaryCreateRequest): Promise<Summary>;
  deleteSummary(id: string): Promise<void>;

  /*  Files  */
  getFile(conversationId: UUID, fileId: UUID): Promise<File>;
  uploadFile(
    conversationId: UUID,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<{ fileId: UUID; abort: () => void }>;
  deleteFile(conversationId: UUID, fileId: UUID): Promise<void>; 

  /*  Customized Prompts  */
  getCustomizedPrompts(): Promise<CustomizedPromptsData>;
  createCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData>;
  updateCustomizedPrompts(data: CustomizedPromptsData): Promise<CustomizedPromptsData>;
  deleteCustomizedPrompts(): Promise<void>;

  /*  Misc  */
  clear(): Promise<void>;       // wipe everything (used on logout)
  close?(): Promise<void>;      // Optional: free IndexedDB handles etc.

  setModels(models: ServerModelInfo[]): void; 
}
