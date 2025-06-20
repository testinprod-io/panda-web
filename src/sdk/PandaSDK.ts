import { ApiService } from './api';
import { AuthManager } from './AuthManager';
import { ChatManager } from './ChatManager';
import { AttestationManager } from './AttestationManager';
import { GetAccessTokenFn } from './client/types';
import { EncryptionService } from '@/sdk/EncryptionService';
import { AuthProvider } from './auth/types';
import { MemoryUserDataStore, UserManager } from './User';

export interface SDKInitializationState {
  isInitialized: boolean;
  isAuthenticating: boolean;
  error?: Error;
}

/**
 * The main entry point for the Panda SDK.
 * This class instantiates and manages all the different modules
 * required for the application's business logic.
 *
 * The UI layer should create a single instance of this SDK
 * and use it to interact with all business logic.
 */
export class PandaSDK {
  public readonly auth: AuthManager;
  public readonly chat: ChatManager;
  public readonly attestation: AttestationManager;
  public readonly encryption: EncryptionService;
  public readonly user: UserManager;
  
  private readonly api: ApiService;
  private initializationState: SDKInitializationState = {
    isInitialized: false,
    isAuthenticating: false,
  };

  constructor(getAccessToken: GetAccessTokenFn, authProvider: AuthProvider) {
    try {
      this.api = new ApiService(getAccessToken);

      this.auth = new AuthManager(this.api, authProvider);
      this.chat = new ChatManager(this.api, this.auth);
      this.attestation = new AttestationManager(this.api);
      this.encryption = new EncryptionService();
      this.user = new UserManager(new MemoryUserDataStore());
      
      console.log('PandaSDK initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize PandaSDK:', error);
      this.initializationState.error = error as Error;
      throw error;
    }
  }

  public async authenticate() {
    if (this.initializationState.isAuthenticating) {
      console.log('Authentication already in progress');
      return;
    }

    this.initializationState.isAuthenticating = true;
    
    try {
      await this.auth.initializeAuthState();
      
      // Only fetch user data if authenticated
      const authState = this.auth.getState();
      if (authState.isAuthenticated) {
        const encryptedId = (await this.api.app.getEncryptedId()).encrypted_id;
        const customizedPrompts = await this.api.app.getCustomizedPrompts();
        
        this.user.updateData({
          encryptedId,
          customizedPromptsData: customizedPrompts,
        });
      }

      this.initializationState.isInitialized = true;
      console.log('PandaSDK authentication completed successfully');
    } catch (error) {
      console.error('Failed to authenticate PandaSDK:', error);
      this.initializationState.error = error as Error;
      throw error;
    } finally {
      this.initializationState.isAuthenticating = false;
    }
  }

  /**
   * Returns the current initialization state of the SDK
   */
  public getInitializationState(): SDKInitializationState {
    return { ...this.initializationState };
  }

  /**
   * Returns whether the SDK is ready to use
   */
  public isReady(): boolean {
    return this.initializationState.isInitialized && !this.initializationState.error;
  }

  /**
   * Returns a summary of the SDK status
   */
  public getStatus() {
    return {
      initialized: this.initializationState.isInitialized,
      authenticating: this.initializationState.isAuthenticating,
      ready: this.isReady(),
      error: this.initializationState.error?.message,
      modules: {
        auth: !!this.auth,
        chat: !!this.chat,
        attestation: !!this.attestation,
        encryption: !!this.encryption,
        user: !!this.user,
      },
    };
  }

  /**
   * Cleans up SDK resources
   */
  public dispose() {
    this.chat.dispose();
    this.initializationState = {
      isInitialized: false,
      isAuthenticating: false,
    };
  }
}
