import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { Chat } from './Chat';
import { UUID } from 'crypto';
import { EncryptionService } from '@/services/encryption-service';
import { EventEmitter } from './events';
import { ModelConfig } from '@/types/constant';
import { Conversation } from '@/client/types';

export class ChatManager extends EventEmitter {
  private api: ApiService;
  private authManager: AuthManager;
  
  public conversations: Conversation[] = [];
  public activeChat: Chat | null = null;

  // State from chat-list.tsx
  public hasMore: boolean = true;
  private nextCursor: string | null = null;
  public isLoading: boolean = false;

  constructor(api: ApiService, authManager: AuthManager) {
    super();
    this.api = api;
    this.authManager = authManager;
    console.log('ChatManager initialized');
  }

  /**
   * Fetches chat sessions from the server, handling both initial load and pagination.
   * Logic adapted from `loadMoreSessions` in `chat-list.tsx`.
   * @param limit The number of sessions to fetch.
   */
  public async loadChats(limit: number = 20) {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.emit('update');
    
    try {
      const response = await this.api.app.getConversations({ limit, cursor: this.nextCursor ?? undefined });
      
      const newConversations = response.data;
      this.conversations = this.nextCursor ? [...this.conversations, ...newConversations] : newConversations;
      
      this.hasMore = response.pagination.has_more;
      this.nextCursor = response.pagination.next_cursor;

    } catch (error) {
      console.error("[SDK-ChatManager] Failed to load chats:", error);
    } finally {
      this.isLoading = false;
      this.emit('update');
    }
  }

  /**
   * Creates a new chat session on the server and locally.
   * @param title The initial title for the chat.
   */
  public async createNewChat(title: string, modelConfig: ModelConfig, customizedPrompts?: string): Promise<Chat> {
    const encryptedTitle = EncryptionService.encrypt(title.trim());
    const newRawChat = await this.api.app.createConversation({ title: encryptedTitle });
    this.conversations.unshift(newRawChat);

    const newChat = new Chat(this.api, this.authManager, newRawChat.conversation_id, newRawChat.title ?? "", modelConfig, customizedPrompts);
    this.activeChat = newChat; // Set the newly created chat as active
    this.emit('update');
    return newChat;
  }

  /**
   * Deletes a chat session.
   * Logic adapted from `handleDeleteItem` in `chat-list.tsx`.
   * @param chatId The ID of the chat to delete.
   */
  public async deleteChat(chatId: UUID) {
    try {
      await this.api.app.deleteConversation(chatId);
      this.conversations = this.conversations.filter(c => c.conversation_id !== chatId);
      if (this.activeChat?.id === chatId) {
        this.activeChat = null;
      }
      this.emit('update');
    } catch (error) {
      console.error(`[SDK-ChatManager] Failed to delete chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Renames a chat session.
   * Logic adapted from `handleRenameItem` in `chat-list.tsx`.
   * @param chatId The ID of the chat to rename.
   * @param newTitle The new title for the chat.
   */
  public async renameChat(chatId: UUID, newTitle: string) {
    const trimmedName = newTitle.trim();
    if (!trimmedName) return;

    try {
      const encryptedTitle = EncryptionService.encrypt(trimmedName);
      await this.api.app.updateConversation(chatId, { title: encryptedTitle });
      
      const conversation = this.conversations.find(c => c.conversation_id === chatId);
      if (conversation) {
        conversation.title = encryptedTitle;
        this.emit('update');
      }
    } catch (error) {
      console.error(`[SDK-ChatManager] Failed to rename chat ${chatId}:`, error);
      throw error;
    }
  }  
  
  public getChatById(id: string): Chat | undefined {
    return this.conversations.find(c => c.conversation_id === id);
  }

  
  public setActiveChat(conversationId: UUID, modelConfig: ModelConfig, customizedPrompts?: string): Chat {
    const conversation = this.conversations.find(c => c.conversation_id === conversationId);
    if (this.activeChat?.id === conversationId) {
        return this.activeChat;
    }
    
    if(conversation) {
        const chat = new Chat(this.api, this.authManager, conversation.conversation_id, conversation.title ?? "", modelConfig, customizedPrompts);
        this.activeChat = chat;
        this.emit('update');
        return chat;
    }
    
    // This should ideally not happen if the UI is in sync
    throw new Error("Conversation not found");
  }

  getState() {
    return {
      conversations: this.conversations,
      isLoading: this.isLoading,
      hasMore: this.hasMore,
      activeChat: this.activeChat,
    };
  }
}
