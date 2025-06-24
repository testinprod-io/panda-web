import { ServerModelInfo, Summary } from "@/client/types";
import { Chat } from "@/sdk/Chat";
import { ChatMessage } from "@/types";

export interface PaginatedChats {
  chats: Chat[];
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
  listChats(cursor?: string, limit?: number): Promise<PaginatedChats>;
  getChat(id: string): Promise<Chat | undefined>;
  createChat(title: string, modelConfig?: any, customData?: Record<string, any>): Promise<Chat>;
  updateChat(chat: Chat): Promise<void>;
  deleteChat(id: string): Promise<void>;

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
  saveSummary(chatId: string, summary: Summary): Promise<void>;
  deleteSummary(id: string): Promise<void>;

  /*  Misc  */
  clear(): Promise<void>;       // wipe everything (used on logout)
  close?(): Promise<void>;      // Optional: free IndexedDB handles etc.

  setModels(models: ServerModelInfo[]): void; 
}
