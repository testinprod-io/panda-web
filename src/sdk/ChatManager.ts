import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { Chat } from './Chat';
import { UUID } from 'crypto';
import { EncryptionService } from '@/services/encryption-service';
import { EventEmitter } from './events';
import { ModelConfig } from '@/types/constant';
import { Conversation } from '@/client/types';
import { CustomizedPromptsData } from '@/types';

export class ChatManager extends EventEmitter {
  private api: ApiService;
  private authManager: AuthManager;
  
  public conversations: Chat[] = [];
  public activeChat: Chat | null = null;

  // State from chat-list.tsx
  public hasMore: boolean = true;
  private nextCursor: string | null = null;
  public isLoading: boolean = false;

  private state: {
    conversations: Chat[];
    isLoading: boolean;
    hasMore: boolean;
    activeChat: Chat | null;
  };

  constructor(api: ApiService, authManager: AuthManager) {
    super();
    this.api = api;
    this.authManager = authManager;
    this.state = this.buildState();
    console.log('ChatManager initialized');
  }

  private buildState() {
    return {
      conversations: this.conversations,
      isLoading: this.isLoading,
      hasMore: this.hasMore,
      activeChat: this.activeChat,
    };
  }

  private updateState() {
    const newState = this.buildState();
    // Simple shallow comparison to see if anything has changed
    if (Object.keys(newState).some(key => (newState as any)[key] !== (this.state as any)[key])) {
        this.state = newState;
        this.emit('update');
    }
  }

  /**
   * Fetches chat sessions from the server, handling both initial load and pagination.
   * Logic adapted from `loadMoreSessions` in `chat-list.tsx`.
   * @param limit The number of sessions to fetch.
   */
  public async loadChats(limit: number = 20) {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.updateState();
    console.log("[SDK-ChatManager] Loading chats");
    try {
      const response = await this.api.app.getConversations({ limit, cursor: this.nextCursor ?? undefined });
      const newConversations = response.data.map(c => new Chat(this.api, this.authManager, c.conversation_id, c.title ?? "", new Date(c.updated_at).getTime(), new Date(c.created_at).getTime(), undefined, c.custom_data as CustomizedPromptsData));
      this.conversations = this.nextCursor ? [...this.conversations, ...newConversations] : newConversations;
      console.log("[SDK-ChatManager] Loaded chats", this.conversations);
      this.hasMore = response.pagination.has_more;
      this.nextCursor = response.pagination.next_cursor;

    } catch (error) {
      console.error("[SDK-ChatManager] Failed to load chats:", error);
    } finally {
      this.isLoading = false;
      this.updateState();
    }
  }

  /**
   * Creates a new chat session on the server and locally.
   * @param title The initial title for the chat.
   */
  public async createNewChat(title: string, modelConfig: ModelConfig, customizedPrompts?: CustomizedPromptsData): Promise<Chat> {
    const encryptedTitle = EncryptionService.encrypt(title.trim());
    const newRawChat = await this.api.app.createConversation({ title: encryptedTitle });
    const newChat = new Chat(this.api, this.authManager, newRawChat.conversation_id, newRawChat.title ?? "", new Date(newRawChat.updated_at).getTime(), new Date(newRawChat.created_at).getTime(), modelConfig, customizedPrompts);
    this.conversations.unshift(newChat);

    this.activeChat = newChat; // Set the newly created chat as active
    this.updateState();
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
      this.conversations = this.conversations.filter(c => c.id !== chatId);
      if (this.activeChat?.id === chatId) {
        this.activeChat = null;
      }
      this.updateState();
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
      
      const conversation = this.conversations.find(c => c.id === chatId);
      if (conversation) {
        conversation.title = encryptedTitle;
        this.updateState();
      }
    } catch (error) {
      console.error(`[SDK-ChatManager] Failed to rename chat ${chatId}:`, error);
      throw error;
    }
  }  
  
  public setActiveChat(conversationId: UUID): Chat {
    if (this.activeChat?.id === conversationId) {
      // If the active chat is already the correct one, just update its config if needed
      // This prevents creating a new Chat object unnecessarily
      // if(this.activeChat.modelConfig !== modelConfig) {
      //   this.activeChat.modelConfig = modelConfig;
      // }
      // if(this.activeChat.customizedPrompts !== customizedPrompts) {
      //   this.activeChat.customizedPrompts = customizedPrompts;
      // }
      return this.activeChat;
    }
    
    const conversation = this.conversations.find(c => c.id === conversationId);
    
    if (conversation) {
        // const chat = new Chat(this.api, this.authManager, conversation.id, conversation.title ?? "", new Date(conversation.updated_at).getTime(), new Date(conversation.created_at).getTime(), modelConfig, customizedPrompts);
        this.activeChat = conversation;
        this.updateState();
        return conversation;
    }
    
    // This should ideally not happen if the UI is in sync
    throw new Error("Conversation not found");
  }

  public getChat(conversationId: UUID): Chat | undefined {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if(conversation) {
      return conversation;
    } else { 
      // this.api.app.getConversations
    }
    return undefined;
  }

  getState() {
    return this.state;
  }
}
