// Shared protocol types for vault communication
// Copied locally to avoid TypeScript rootDir issues

export interface InitMsg {
  cmd: "init";
  // accessToken?: string; // Privy access token for authentication
  // encryptedPassword?: string; // Previously saved encrypted password
}

export interface AckMsg {
  ok: true;
  origin?: string;
}

export interface GetPersistedKeyReq {
  id: string;
  cmd: "getPersistedKey";
}

export interface GetPersistedKeyRes {
  id: string;
  encryptedKey: string;
}

export interface UpdateKeyReq {
  id: string;
  cmd: "updateKey";
  encryptedPassword: string;
}

export interface UpdateKeyRes {
  id: string;
  ok: true;
  newEncryptedPassword: string;
}

export interface SetPasswordReq {
  id: string;
  cmd: "setPassword";
  password: string;
}

export interface SetPasswordRes {
  id: string;
  ok: true;
  encryptedPassword: string;
}

export interface DeriveReq {
  id: string;
  cmd: "derive";
}

export interface DeriveRes {
  id: string;
  ok: true;
}

export interface EncryptReq {
  id: string;
  cmd: "encrypt";
  plain: string;
}

export interface EncryptRes {
  id: string;
  encrypted: string;
}

export interface DecryptReq {
  id: string;
  cmd: "decrypt";
  encrypted: string;
}

export interface DecryptRes {
  id: string;
  plain: string;
}

export interface ErrorRes {
  id: string;
  error: string;
}

export type VaultRequest = DeriveReq | EncryptReq | DecryptReq | UpdateKeyReq | SetPasswordReq;
export type VaultResponse = DeriveRes | EncryptRes | DecryptRes | UpdateKeyRes | SetPasswordRes | ErrorRes;

// API types for /deriveKey endpoint
export interface DeriveKeyResponse {
  oldKey: string | null; // Base64 encoded old key (null if password rotation needed)
  newKey: string; // Base64 encoded new key
}