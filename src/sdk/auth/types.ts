export interface User {
  id: string;
  [key: string]: any;
}

export type AuthStateListener = (payload: { isAuthenticated: boolean, user: User | null }) => void;

export interface AuthProvider {
  getIsAuthenticated(): Promise<boolean>;
  getUser(): Promise<User | null>;
  addAuthStateListener(listener: AuthStateListener): void;
  removeAuthStateListener(listener: AuthStateListener): void;
  logout(): Promise<void>;
} 