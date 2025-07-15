import { ApiService } from "./api";
import { AuthManager } from "./AuthManager";
import { ChatManager } from "./ChatManager";
import { AttestationManager } from "./AttestationManager";
import { GetAccessTokenFn, ServerModelInfo } from "./client/types";
import { EncryptionService } from "@/sdk/EncryptionService";
import { VaultIntegration } from "@/sdk/vault/VaultIntegration";
import { AuthProvider } from "./auth/types";
import { MemoryUserDataStore, UserManager } from "./User";
import { EventBus } from "./events";
import { IStorage } from "./storage/i-storage";
import { ServerStorage /*, LocalStorage, MemoryStorage */ } from "./storage";
import { ConfigManager } from "./ConfigManager";

export class PandaSDK {
  public readonly bus: EventBus = new EventBus();

  public readonly auth: AuthManager;
  public readonly chat: ChatManager;
  public readonly attestation: AttestationManager;
  public readonly encryption: EncryptionService;
  public readonly user: UserManager;
  public readonly config: ConfigManager;

  public readonly storage: IStorage;
  public readonly api: ApiService;
  public initialized: boolean = false;
  public ready: boolean = false;
  private isReadying: boolean = false;
  private vaultIntegration: VaultIntegration | null = null;

  constructor(
    getAccessToken: GetAccessTokenFn,
    authProvider: AuthProvider,
    vaultIntegration?: VaultIntegration
  ) {
    console.log("[PandaSDK] Constructor called from:", new Error().stack);
    this.api = new ApiService(getAccessToken);

    // Use vault-integrated encryption service if available, otherwise create new one
    this.vaultIntegration = vaultIntegration || null;
    this.encryption = vaultIntegration
      ? vaultIntegration.getEncryptionService()
      : new EncryptionService();

    console.log(
      "[PandaSDK] Using encryption service:",
      vaultIntegration ? "vault-integrated" : "legacy"
    );

    this.attestation = new AttestationManager(this.api, this.bus);

    this.config = new ConfigManager(this.bus, this.encryption);
    this.auth = new AuthManager(
      this.bus,
      this.api,
      authProvider,
      this.encryption
    );

    // this.storage = new LocalStorage(this.bus, this.encryption);
    this.storage = new ServerStorage(
      this.bus,
      this.api,
      this.auth,
      this.encryption
    );
    // this.storage = new MemoryStorage(this.bus, this.encryption);
    this.chat = new ChatManager(
      this.bus,
      this.api,
      this.auth,
      this.encryption,
      this.attestation,
      this.storage,
      this.config
    );
    this.user = new UserManager(new MemoryUserDataStore(), this.bus);

    this.bus.on("auth.status.updated", (isAuthenticated) => {
      if (isAuthenticated) {
        console.log("auth.status.updated", isAuthenticated);
        this.handleAuthenticated();
      } else {
        this.ready = false;
        this.bus.emit("sdk.ready", false);
      }
    });

    this.initialized = true;
    console.log("PandaSDK initialized successfully!");
  }

  /**
   * Get the vault integration instance
   */
  public getVaultIntegration(): VaultIntegration | null {
    return this.vaultIntegration;
  }

  /**
   * Check if vault integration is available and ready
   */
  public isVaultReady(): boolean {
    return !!this.vaultIntegration?.isVaultReady();
  }

  public async handleAuthenticated() {
    if (this.ready || this.isReadying) {
      return;
    }
    this.isReadying = true;

    const [info, authState] = await Promise.all([
      this.api.app.getInfo(),
      this.auth.initializeAuthState(),
    ]);

    try {
      const customizedPrompts = await this.api.app.getCustomizedPrompts();
      this.user.updateData({ customizedPromptsData: customizedPrompts });
      this.config.setCustomizedPrompts(customizedPrompts);
    } catch {}
    this.config.setModels(info.models);

    this.ready = true;
    this.isReadying = false;
    this.bus.emit("sdk.ready", true);
  }
  // You could add global SDK methods here if needed, for example:
  public getStatus() {
    return {
      initialized: true,
      // more status properties...
    };
  }
}
