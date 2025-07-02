// Shared protocol types for vault communication

export interface InitMsg {
  cmd: "init";
  accessToken?: string; // Privy access token for authentication
}

export interface AckMsg {
  ok: true;
  origin?: string;
}

export interface UpdateKeyEvent { 
  id: string;
  cmd: "updateKey";
  encryptedKey: string;
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

export type VaultRequest = DeriveReq | EncryptReq | DecryptReq;
export type VaultResponse = DeriveRes | EncryptRes | DecryptRes | ErrorRes;

// API types for /deriveKey endpoint
export interface DeriveKeyResponse {
  wrappedKey: string; // Base64 encoded wrapped key
}