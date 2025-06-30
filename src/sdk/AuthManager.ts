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
    if (newState.isAuthenticated !== undefined && newState.isAuthenticated !== this.state.isAuthenticated) {
      this.bus.emit("auth.status.updated", newState.isAuthenticated);
    }

    this.state = { ...this.state, ...newState };
    this.bus.emit("auth.state.updated", this.state);
  }

  public async initializeAuthState() {
    const isAuthenticated = await this.authProvider.getIsAuthenticated();
    const user = await this.authProvider.getUser();
    this.updateState({
      isAuthenticated,
      user,
    });
    try {
      const encryptedId = (await this.api.app.getEncryptedId()).encrypted_id;
      this.updateState({
        encryptedId,
        }); 
    } catch { }
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
  };

  public async createPassword(password: string): Promise<void> {
    if (!this.state.user?.id) {
      throw new Error("User ID not found");
    }

    this.encryptionService.setKeyFromPassword(password);
    
    const encryptedVerificationToken = this.encryptionService.encryptVerificationToken(this.state.user.id);
    await this.api.app.createEncryptedId(encryptedVerificationToken);

    this.updateState({ isLocked: false });
    this.bus.emit("app.unlocked", undefined);
  }

  public async unlock(password: string): Promise<boolean> {
    console.log("Unlocking with password...");
    if (!this.state.isAuthenticated) {
      throw new Error("User is not authenticated");
    }

    if (!this.state.user?.id) {
      throw new Error("User ID not found");
    }

    if (
      this.state.encryptedId &&
      (await this.encryptionService.verifyKey(
        this.state.encryptedId,
        this.state.user.id,
        password
      ))
    ) {
      this.updateState({ isLocked: false });
      this.encryptionService.setKeyFromPassword(password); // Sets the key for active use
      this.bus.emit("app.unlocked", undefined);
      return true;
    } else {
      return false;
    }
  }

  public async lock(): Promise<void> {
    this.updateState({ isLocked: true });
    this.encryptionService.clearKey();
    this.bus.emit("app.locked", undefined);
  }

  public async logout(): Promise<void> {
    this.updateState({ isLocked: true, isAuthenticated: false });
    this.encryptionService.clearKey();
    await this.authProvider.logout();
    this.bus.emit("app.locked", undefined);
  }
}
