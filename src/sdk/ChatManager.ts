import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { Chat } from './Chat';
import { UUID } from 'crypto';
import { EncryptionService } from './EncryptionService';
import { EventBus } from './events';
import { Conversation, ServerModelInfo } from '@/client/types';
import { CustomizedPromptsData } from '@/types';
import { AttestationManager } from './AttestationManager';
import { IStorage } from './storage/i-storage';

export class ChatManager {
  private bus: EventBus;
  private api: ApiService;
  private authManager: AuthManager;
  private encryptionService: EncryptionService;
  private attestationManager: AttestationManager;
  private storage: IStorage;
  
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

  constructor(
    bus: EventBus,
    api: ApiService,
    authManager: AuthManager,
    encryptionService: EncryptionService,
    attestationManager: AttestationManager,
    storage: IStorage,
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.encryptionService = encryptionService;
    this.attestationManager = attestationManager;
    this.storage = storage;
    this.state = this.buildState();
    console.log('ChatManager initialized');

    this.bus.on('app.unlocked', () => {
      this.conversations = this.conversations.map(c => {
        c.title = this.encryptionService.decrypt(c.encryptedTitle);
        return c;
      });
      this.updateState();
    });

    this.bus.on('app.locked', () => {
      this.conversations = this.conversations.map(c => {
        c.title = c.encryptedTitle;
        return c;
      });
      this.updateState();
    });
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
    this.state = this.buildState();
    this.bus.emit('chat.list.updated', undefined);
  }

  private insertChat(chat: Chat) {
    chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
    this.conversations = [chat, ...this.conversations];
    this.updateState();
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
      const { chats, hasMore, nextCursor } = await this.storage.listChats(
        this.nextCursor ?? undefined,
        limit,
      );

      this.conversations = this.nextCursor
        ? [...this.conversations, ...chats]
        : chats;
      console.log("[SDK-ChatManager] Loaded chats", this.conversations);
      this.hasMore = hasMore;
      this.nextCursor = nextCursor;

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
  public async createNewChat(
    title: string,
    modelConfig: ServerModelInfo,
    customData?: Record<string, any>,
  ): Promise<Chat> {
    const newChat = await this.storage.createChat(
      title,
      modelConfig,
      customData,
    );
    this.insertChat(newChat);

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
      await this.storage.deleteChat(chatId as string);
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
      const encryptedTitle = this.encryptionService.encrypt(trimmedName);
      const conversation = this.conversations.find((c) => c.id === chatId);
      if (conversation) {
        conversation.title = trimmedName;
        conversation.encryptedTitle = encryptedTitle;
        await this.storage.updateChat(conversation);
        this.updateState();
      }
    } catch (error) {
      console.error(`[SDK-ChatManager] Failed to rename chat ${chatId}:`, error);
      throw error;
    }
  }  
  
  public setActiveChat(chat: Chat): Chat {
    // if (this.activeChat?.id === conversationId) {
    //   // If the active chat is already the correct one, just update its config if needed
    //   // This prevents creating a new Chat object unnecessarily
    //   // if(this.activeChat.modelConfig !== modelConfig) {
    //   //   this.activeChat.modelConfig = modelConfig;
    //   // }
    //   // if(this.activeChat.customizedPrompts !== customizedPrompts) {
    //   //   this.activeChat.customizedPrompts = customizedPrompts;
    //   // }
    //   return this.activeChat;
    // }
    
    // const conversation = this.conversations.find(c => c.id === conversationId);
    
    // if (conversation) {
        // const chat = new Chat(this.api, this.authManager, conversation.id, conversation.title ?? "", new Date(conversation.updated_at).getTime(), new Date(conversation.created_at).getTime(), modelConfig, customizedPrompts);
    this.activeChat = chat;
    this.updateState();
    return chat;
    // }
    
    // This should ideally not happen if the UI is in sync
    throw new Error("Conversation not found");
  }

  public async getChat(conversationId: UUID): Promise<Chat | undefined> {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation) {
      return conversation;
    } else {
      try {
        const chat = await this.storage.getChat(conversationId as string);
        if (chat) {
          chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
        }
        return chat;
      } catch (error) {
        console.error(`[SDK-ChatManager] Failed to get chat ${conversationId}:`, error);
        return undefined;
      }
    }
  }

  getState() {
    return this.state;
  }
}
