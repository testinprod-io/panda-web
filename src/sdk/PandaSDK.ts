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
import { ServerStorage } from './storage/server-storage';
import { ConfigManager } from './ConfigManager';
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
  private initializing: boolean = false;
  constructor(getAccessToken: GetAccessTokenFn, authProvider: AuthProvider) {
    console.log('[PandaSDK] Constructor called from:', new Error().stack);
    this.api = new ApiService(getAccessToken);
    this.config = new ConfigManager(this.bus);

    this.encryption = new EncryptionService();
    this.attestation = new AttestationManager(this.api, this.bus);

    this.auth = new AuthManager(this.bus, this.api, authProvider, this.encryption);
    
    this.storage = new ServerStorage(this.bus, this.api, this.auth, this.encryption);
    this.chat = new ChatManager(this.bus, this.api, this.auth, this.encryption, this.attestation, this.storage, this.config);
    this.user = new UserManager(new MemoryUserDataStore(), this.bus);
    
    this.bus.on('auth.status.updated', ( isAuthenticated ) => {
      if (isAuthenticated) {
        console.log("auth.status.updated", isAuthenticated);
        this.handleAuthenticated();
      }
    });
    
    console.log('PandaSDK initialized successfully!');
  }

  public async handleAuthenticated() {
    if (this.initialized || this.initializing) {
      return;
    }
    console.log("handleAuthenticated");
    console.log("[PandaSDK] handleAuthenticated called from:", new Error().stack);
    this.initializing = true;
    
    const [customizedPrompts, info, authState] = await Promise.all([
      this.api.app.getCustomizedPrompts(),
      this.api.app.getInfo(),
      this.auth.initializeAuthState(),
    ]);

    this.user.updateData({customizedPromptsData: customizedPrompts});
    this.config.setCustomizedPrompts(customizedPrompts);
    this.config.setModels(info.models);
    
    this.initialized = true;
  }
  // You could add global SDK methods here if needed, for example:
  public getStatus() {
    return {
      initialized: true,
      // more status properties...
    };
  }
}
