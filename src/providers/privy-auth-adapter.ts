import {
  AuthProvider,
  AuthStateListener,
  User as SdkUser,
} from "@/sdk/auth/types";
import { User as PrivyUser, PrivyInterface } from "@privy-io/react-auth";
import { EventEmitter } from "@/sdk/events";

function mapPrivyUserToSdkUser(privyUser: PrivyUser | null): SdkUser | null {
  if (!privyUser) return null;
  return { ...privyUser };
}

export class PrivyAuthAdapter extends EventEmitter implements AuthProvider {
  private privy: PrivyInterface;
  private _isAuthenticated: boolean = false;
  private _user: PrivyUser | null = null;

  constructor(privy: PrivyInterface) {
    super();
    this.privy = privy;
  }

  // This is required by the EventEmitter base class
  getState() {
    return {
      isAuthenticated: this._isAuthenticated,
      user: mapPrivyUserToSdkUser(this._user),
    };
  }

  public updateAuthState(authenticated: boolean, user: PrivyUser | null) {
    const changed = this._isAuthenticated !== authenticated;
    this._isAuthenticated = authenticated;
    this._user = user;
    if (changed) {
      this.emit("authStateChanged", {
        isAuthenticated: this._isAuthenticated,
        user: mapPrivyUserToSdkUser(this._user),
      });
    }
  }

  async getIsAuthenticated(): Promise<boolean> {
    return this._isAuthenticated;
  }

  async getUser(): Promise<SdkUser | null> {
    return mapPrivyUserToSdkUser(this._user);
  }

  addAuthStateListener(listener: AuthStateListener): void {
    this.on("authStateChanged", listener);
  }

  removeAuthStateListener(listener: AuthStateListener): void {
    this.off("authStateChanged", listener);
  }

  async logout(): Promise<void> {
    await this.privy.logout();
  }
}
