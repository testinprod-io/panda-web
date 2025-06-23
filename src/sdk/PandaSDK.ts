import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { ChatManager } from './ChatManager';
import { AttestationManager } from './AttestationManager';
import { GetAccessTokenFn } from './client/types';
import { EncryptionService } from '@/sdk/EncryptionService';
import { AuthProvider } from './auth/types';
import { MemoryUserDataStore, UserManager } from './User';
import { EventBus } from './events';
import { IStorage } from './storage/i-storage';
import { ServerStorage } from './storage/server-storage';
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
  
  private readonly storage: IStorage;
  private readonly api: ApiService;

  constructor(getAccessToken: GetAccessTokenFn, authProvider: AuthProvider) {
    this.api = new ApiService(getAccessToken);

    this.encryption = new EncryptionService();
    this.attestation = new AttestationManager(this.api);

    this.auth = new AuthManager(this.bus, this.api, authProvider, this.encryption);
    
    this.storage = new ServerStorage(this.bus, this.api, this.auth, this.encryption);
    this.chat = new ChatManager(this.bus, this.api, this.auth, this.encryption, this.attestation, this.storage);
    this.user = new UserManager(new MemoryUserDataStore());
    
    console.log('PandaSDK initialized successfully!');
  }

  public async authenticate() { 
    await this.auth.initializeAuthState();
    
    const encryptedId = (await this.api.app.getEncryptedId()).encrypted_id;
    const customizedPrompts = await this.api.app.getCustomizedPrompts();
    this.user.updateData({
      encryptedId,
      customizedPromptsData: customizedPrompts,
    });
  }

  // You could add global SDK methods here if needed, for example:
  public getStatus() {
    return {
      initialized: true,
      // more status properties...
    };
  }
}
