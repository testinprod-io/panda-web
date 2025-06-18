import { ApiService } from './api';
import { AuthProvider, User } from './auth/types';
import { EventEmitter } from './events';

export class AuthManager extends EventEmitter {
  private api: ApiService;
  private authProvider: AuthProvider;
  private isAuthenticated: boolean = false;
  private user: User | null = null;

  constructor(api: ApiService, authProvider: AuthProvider) {
    super();
    this.api = api;
    this.authProvider = authProvider;
    console.log('AuthManager initialized');

    this.authProvider.addAuthStateListener(this.handleAuthStateChange);
    this.initializeAuthState();
  }

  // This is required by the EventEmitter base class
  getState() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.user,
    };
  }

  public async initializeAuthState() {
    this.isAuthenticated = await this.authProvider.getIsAuthenticated();
    this.user = await this.authProvider.getUser();
    this.emit('authStateChanged', { isAuthenticated: this.isAuthenticated, user: this.user });
  }

  private handleAuthStateChange = async (isAuthenticated: boolean) => {
    if (this.isAuthenticated !== isAuthenticated) {
      this.isAuthenticated = isAuthenticated;
      this.user = isAuthenticated ? await this.authProvider.getUser() : null;
      console.log('Auth state changed in SDK:', this.isAuthenticated);
      this.emit('authStateChanged', { isAuthenticated: this.isAuthenticated, user: this.user });
    }
  };

  public async unlock(password: string): Promise<boolean> {
    console.log('Unlocking with password...');
    // const response = await this.api.post('/auth/unlock', { password });
    // return response.success;
    return true; // Placeholder
  }

  public async logout(): Promise<void> {
    await this.authProvider.logout();
  }
}
