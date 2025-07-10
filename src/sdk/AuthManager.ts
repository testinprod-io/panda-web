import { ApiService } from "./api";
import { AuthProvider, User } from "./auth/types";
import { EncryptionService } from "./EncryptionService";
import { EventBus } from "./events";

export class AuthManager {
  private bus: EventBus;
  private api: ApiService;

  private encryptionService: EncryptionService;

  private authProvider: AuthProvider;

  private state: {
    isAuthenticated: boolean;
    isLocked: boolean;
    encryptedId: string | null;
    user: User | null;
  };

  constructor(
    bus: EventBus,
    api: ApiService,
    authProvider: AuthProvider,
    encryptionService: EncryptionService
  ) {
    this.bus = bus;
    this.api = api;
    this.authProvider = authProvider;
    this.encryptionService = encryptionService;

    this.state = {
      isAuthenticated: false,
      isLocked: true,
      encryptedId: null,
      user: null,
    };

    console.log("AuthManager initialized");

    this.authProvider.addAuthStateListener(this.handleAuthStateChange);
    // this.initializeAuthState();
  }

  // This is required by the EventEmitter base class
  getState() {
    return this.state;
  }

  private updateState(newState: Partial<typeof this.state>) {
    console.log("updateState", newState);
    if (newState.isAuthenticated !== undefined && newState.isAuthenticated !== this.state.isAuthenticated) {
      this.bus.emit("auth.status.updated", newState.isAuthenticated);
    }

    this.state = { ...this.state, ...newState };
    this.bus.emit("auth.state.updated", this.state);
    console.log("auth.state.updated", this.state);
  }

  public async initializeAuthState() {
    console.log("🚀 INITIALIZE AUTH STATE STARTED", new Date().toISOString());
    const isAuthenticated = await this.authProvider.getIsAuthenticated();
    const user = await this.authProvider.getUser();
    console.log("🚀 INITIALIZE AUTH STATE - Got from provider:", {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
    
    this.updateState({
      isAuthenticated,
      user,
    });
    
    try {
      const encryptedId = (await this.api.app.getEncryptedId()).encrypted_id;
      console.log("🚀 INITIALIZE AUTH STATE - Got encryptedId:", !!encryptedId);
      this.updateState({
        encryptedId,
        }); 
    } catch (error) {
      console.log("🚀 INITIALIZE AUTH STATE - No encryptedId found:", error);
    }
    
    console.log("🚀 INITIALIZE AUTH STATE COMPLETED", new Date().toISOString());
  }

  private handleAuthStateChange = async (payload: {
    isAuthenticated: boolean;
    user: User | null;
  }) => {
    console.log("handleAuthStateChange", payload);

    if (this.state.isAuthenticated !== payload.isAuthenticated) {
      const newState: Partial<typeof this.state> = {
        isAuthenticated: payload.isAuthenticated,
        user: payload.isAuthenticated ? payload.user : null,
      };

      if (!payload.isAuthenticated) {
        this.lock();
      }

      this.updateState(newState);
    }
  }

  public async unlock(): Promise<boolean> {
    console.log("🔓 UNLOCK CALLED - AuthManager state:", {
      isAuthenticated: this.state.isAuthenticated,
      isLocked: this.state.isLocked,
      hasUser: !!this.state.user,
      userId: this.state.user?.id,
      hasEncryptedId: !!this.state.encryptedId,
      timestamp: new Date().toISOString()
    });
    
    // Check auth provider directly for comparison
    const providerAuth = await this.authProvider.getIsAuthenticated();
    const providerUser = await this.authProvider.getUser();
    console.log("🔓 UNLOCK CALLED - AuthProvider state:", {
      isAuthenticated: providerAuth,
      hasUser: !!providerUser,
      userId: providerUser?.id,
      timestamp: new Date().toISOString()
    });

    if (!this.state.isAuthenticated) {
      console.log("❌ User is not authenticated (AuthManager internal state)");
      console.log("🔍 But AuthProvider says:", providerAuth);
      return false;
    }

    if (!this.state.user?.id) {
      console.log("❌ User ID not found");
      return false;
    }

    // if (
    //   this.state.encryptedId // &&
    // //   (await this.encryptionService.verifyKey(
    // //     this.state.encryptedId,
    // //     this.state.user.id,
    // //     password
    // //   ))
    // ) {
      this.updateState({ isLocked: false });
      // this.encryptionService.setKeyFromPassword(password); // Sets the key for active use
      this.bus.emit("app.unlocked", undefined);
      console.log("✅ UNLOCK SUCCESSFUL - AuthManager unlocked the app");
      return true;
    // } else {
    //   return false;
    // }
  }

  public async lock(): Promise<void> {
    console.log("lock");
    this.updateState({ isLocked: true });
    this.bus.emit("app.locked", undefined);
  }

  public async logout(): Promise<void> {
    this.updateState({ isAuthenticated: false });
    await this.lock();
    await this.authProvider.logout();
  }
}
