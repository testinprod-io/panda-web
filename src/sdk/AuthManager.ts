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
    isFirstTimeUser: boolean;
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
      isFirstTimeUser: false,
      user: null,
    };

    console.log("AuthManager initialized");

    this.authProvider.addAuthStateListener(this.handleAuthStateChange);
    this.initializeAuthState();
  }

  // This is required by the EventEmitter base class
  getState() {
    return this.state;
  }

  private updateState(newState: Partial<typeof this.state>) {
    this.state = { ...this.state, ...newState };
    this.bus.emit("auth.status.updated", this.state);
  }

  public async initializeAuthState() {
    const isAuthenticated = await this.authProvider.getIsAuthenticated();
    const user = await this.authProvider.getUser();
    this.updateState({
      isAuthenticated,
      user,
    });
  }

  private handleAuthStateChange = async (payload: {
    isAuthenticated: boolean;
    user: User | null;
  }) => {
    if (this.state.isAuthenticated !== payload.isAuthenticated) {
      const isFirstTimeUser = payload.isAuthenticated
        ? (await this.api.app.getEncryptedId()) !== null
        : false;

      const newState: Partial<typeof this.state> = {
        isAuthenticated: payload.isAuthenticated,
        user: payload.isAuthenticated ? payload.user : null,
        isFirstTimeUser,
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

    const encryptedVerificationToken =
      this.encryptionService.encryptVerificationToken(this.state.user.id);
    await this.api.app.createEncryptedId(encryptedVerificationToken);

    this.encryptionService.setKeyFromPassword(password);
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

    const verificationToken = await this.api.app.getEncryptedId();

    if (
      verificationToken &&
      (await this.encryptionService.verifyKey(
        verificationToken.encrypted_id,
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
    this.updateState({ isLocked: true });
    this.encryptionService.clearKey();
    await this.authProvider.logout();
    this.bus.emit("app.locked", undefined);
  }
}
