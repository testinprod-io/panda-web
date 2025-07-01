// Shared protocol types for vault communication
// Copied locally to avoid TypeScript rootDir issues

export interface InitMsg {
  cmd: "init";
}

export interface AckMsg {
  ok: true;
  origin?: string;
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
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
}

export interface DecryptReq {
  id: string;
  cmd: "decrypt";
  cipher: ArrayBuffer;
  iv: ArrayBuffer;
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