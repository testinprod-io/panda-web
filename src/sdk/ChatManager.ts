import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { Chat } from './Chat';
import { UUID } from 'crypto';
import { EncryptionService } from './EncryptionService';
import { EventBus } from './events';
import { Conversation, ServerModelInfo } from '@/client/types';
import { CustomizedPromptsData, generateSystemPrompt } from '@/types';
import { AttestationManager } from './AttestationManager';
import { IStorage } from './storage/i-storage';
import { ConfigManager } from './ConfigManager';

export class ChatManager {
  private bus: EventBus;
  private api: ApiService;
  private authManager: AuthManager;
  private encryptionService: EncryptionService;
  private attestationManager: AttestationManager;
  private storage: IStorage;
  private config: ConfigManager;
  
  public conversations: Chat[] = [];
  public activeChat: Chat | null = null;
  public activeChatId: UUID | null = null;

  // State from chat-list.tsx
  public hasMore: boolean = true;
  private nextCursor: string | null = null;
  public isLoading: boolean = false;

  private state: {
    conversations: Chat[];
    isLoading: boolean;
    hasMore: boolean;
    activeChat: Chat | null;
    activeChatId: UUID | null;
  };

  constructor(
    bus: EventBus,
    api: ApiService,
    authManager: AuthManager,
    encryptionService: EncryptionService,
    attestationManager: AttestationManager,
    storage: IStorage,
    config: ConfigManager,
  ) {
    this.bus = bus;
    this.api = api;
    this.authManager = authManager;
    this.encryptionService = encryptionService;
    this.attestationManager = attestationManager;
    this.storage = storage;
    this.config = config;
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

    this.bus.on('auth.status.updated', ( isAuthenticated ) => {
      if (!isAuthenticated) {
        this.conversations = [];
        this.activeChat = null;
        this.updateState();
      }
    });
  }

  private buildState() {
    return {
      conversations: this.conversations,
      isLoading: this.isLoading,
      hasMore: this.hasMore,
      activeChat: this.activeChat,
      activeChatId: this.activeChatId,
    };
  }

  private updateState() {
    this.state = this.buildState();
    this.bus.emit('chat.list.updated', undefined);
  }

  private insertChat(chat: Chat) {
    this.conversations = [
      chat,
      ...this.conversations.filter((c) => c.id !== chat.id),
    ];
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
      const { conversations, hasMore, nextCursor } = await this.storage.listChats(
        this.nextCursor ?? undefined,
        limit,
      );

      const newChats = conversations.map(c => this.fromConversation(c));

      this.conversations = this.nextCursor
        ? [...this.conversations, ...newChats]
        : newChats;
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
    topic: string,
    modelConfig?: ServerModelInfo,
    customizedPrompts?: CustomizedPromptsData
  ): Promise<Chat> {
    const customizedPrompt = customizedPrompts ? this.encryptionService.encrypt(generateSystemPrompt(customizedPrompts)) : null;
    const newConversation = await this.storage.createChat(topic, {
      default_model_name: modelConfig?.model_name,
      customized_prompts: customizedPrompt,
    });
    const chat = this.fromConversation(newConversation);
    this.insertChat(chat);
    this.setActiveChat(chat);
    return chat;
  }

  private fromConversation(conversation: Conversation): Chat {
    const chat = new Chat(
      this.bus,
      this.api,
      this.authManager,
      this.encryptionService,
      this.storage,
      this.config,
      conversation.conversation_id,
      conversation.title ?? "New Chat",
      new Date(conversation.updated_at).getTime(),
      new Date(conversation.created_at).getTime(),
      conversation.custom_data,
    );
    chat.title = this.encryptionService.decrypt(chat.encryptedTitle);
    return chat;
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
        await this.storage.updateChat(conversation.id, {
          title: trimmedName,
          custom_data: conversation.customData,
        });
        this.updateState();
      }
    } catch (error) {
      console.error(`[SDK-ChatManager] Failed to rename chat ${chatId}:`, error);
      throw error;
    }
  }  

  public clearActiveChat() {
    this.activeChat = null;
    this.activeChatId = null;
    this.updateState();
  }

  public setActiveChat(chat: Chat): Chat {
    this.activeChat = chat;
    this.updateState();
    return chat;
  }

  public setActiveChatId(chatId: UUID) {
    this.activeChatId = chatId;
    this.updateState();
  }

  public async getChat(conversationId: UUID): Promise<Chat | undefined> {
    const existingChat = this.conversations.find(
      (c) => c.id === conversationId,
    );
    if (existingChat) {
      return existingChat;
    } else {
      try {
        const conversation = await this.storage.getChat(conversationId as string);
        if (conversation) {
          const chat = this.fromConversation(conversation);
          this.insertChat(chat);
          return chat;
        }
        return undefined;
      } catch (error) {
        console.error(
          `[SDK-ChatManager] Failed to get chat ${conversationId}:`,
          error,
        );
        return undefined;
      }
    }
  }

  getState() {
    return this.state;
  }
}
