import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { ChatManager } from './ChatManager';
import { AttestationManager } from './AttestationManager';
import { GetAccessTokenFn, ServerModelInfo } from './client/types';
import { EncryptionService } from '@/sdk/EncryptionService';
import { AuthProvider } from './auth/types';
import { MemoryUserDataStore, UserManager } from './User';
import { EventBus } from './events';
import { IStorage } from './storage/i-storage';
import { ServerStorage /*, LocalStorage, MemoryStorage */ } from './storage';
import { ConfigManager } from './ConfigManager';
import { ApiError } from './client/types';
/**
 * The main entry point for the Panda SDK.
 * This class instantiates and manages all the different modules
 * required for the application's business logic.
 *
 * The UI layer should create a single instance of this SDK
 * and use it to interact with all business logic.
 */
export class PandaSDK {
  public readonly bus: EventBus = new EventBus();
  
  public readonly auth: AuthManager;
  public readonly chat: ChatManager;
  public readonly attestation: AttestationManager;
  public readonly encryption: EncryptionService;
  public readonly user: UserManager;
  public readonly config: ConfigManager;

  private readonly storage: IStorage;
  public readonly api: ApiService;
  public initialized: boolean = false;
  public ready: boolean = false;
  private isReadying: boolean = false;
  constructor(getAccessToken: GetAccessTokenFn, authProvider: AuthProvider) {
    console.log('[PandaSDK] Constructor called from:', new Error().stack);
    this.api = new ApiService(getAccessToken);
    
    this.encryption = new EncryptionService();
    this.attestation = new AttestationManager(this.api, this.bus);
    
    this.config = new ConfigManager(this.bus, this.encryption);
    this.auth = new AuthManager(this.bus, this.api, authProvider, this.encryption);
    
    // this.storage = new LocalStorage(this.bus, this.encryption);
    this.storage = new ServerStorage(this.bus, this.api, this.auth, this.encryption);
    // this.storage = new MemoryStorage(this.bus, this.encryption);
    this.chat = new ChatManager(this.bus, this.api, this.auth, this.encryption, this.attestation, this.storage, this.config);
    this.user = new UserManager(new MemoryUserDataStore(), this.bus);
    
    this.bus.on('auth.status.updated', ( isAuthenticated ) => {
      if (isAuthenticated) {
        console.log("auth.status.updated", isAuthenticated);
        this.handleAuthenticated();
      } else {
        this.ready = false;
        this.bus.emit('sdk.ready', false);
      }
    });
    
    this.initialized = true;
    console.log('PandaSDK initialized successfully!');
  }

  public async handleAuthenticated() {
    if (this.ready || this.isReadying) {
      return;
    }
    console.log("handleAuthenticated");
    console.log("[PandaSDK] handleAuthenticated called from:", new Error().stack);
    this.isReadying = true;
    
    const [info, authState] = await Promise.all([
      this.api.app.getInfo(),
      this.auth.initializeAuthState(),
    ]);
    
    try {
      const customizedPrompts = await this.api.app.getCustomizedPrompts()
      this.user.updateData({customizedPromptsData: customizedPrompts});
      this.config.setCustomizedPrompts(customizedPrompts);
    } catch { }
    this.config.setModels(info.models);
    
    this.ready = true;
    this.isReadying = false;
    this.bus.emit('sdk.ready', true);
  }
  // You could add global SDK methods here if needed, for example:
  public getStatus() {
    return {
      initialized: true,
      // more status properties...
    };
  }
}
