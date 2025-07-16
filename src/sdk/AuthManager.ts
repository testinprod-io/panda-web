import { ApiService } from "./api";
import { AuthProvider, User } from "./auth/types";
import { EncryptionService } from "./EncryptionService";
import { EventBus } from "./events";

export class AuthManager {
  private bus: EventBus;
  private api: ApiService;

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

    this.state = {
      isAuthenticated: false,
      isLocked: true,
      encryptedId: null,
      user: null,
    };

    this.authProvider.addAuthStateListener(this.handleAuthStateChange);
  }

  getState() {
    return this.state;
  }

  private updateState(newState: Partial<typeof this.state>) {
    if (
      newState.isAuthenticated !== undefined &&
      newState.isAuthenticated !== this.state.isAuthenticated
    ) {
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
    } catch (error) {}
  }

  private handleAuthStateChange = async (payload: {
    isAuthenticated: boolean;
    user: User | null;
  }) => {
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

  public async unlock(): Promise<boolean> {
    if (!this.state.isAuthenticated) {
      return false;
    }

    if (!this.state.user?.id) {
      return false;
    }

    this.updateState({ isLocked: false });
    this.bus.emit("app.unlocked", undefined);
    return true;
  }

  public async lock(): Promise<void> {
    this.updateState({ isLocked: true });
    this.bus.emit("app.locked", undefined);
  }

  public async logout(): Promise<void> {
    this.updateState({ isAuthenticated: false });
    await this.lock();
    await this.authProvider.logout();
  }
}
