// Shared protocol types for vault communication

export interface InitMsg {
  cmd: "init";
  encryptedId?: string; // User's encrypted ID from server
  userId?: string; // Expected user ID for validation
  encryptedPassword?: string; // Previously saved encrypted password
}

export interface AckMsg {
  ok: true;
  origin?: string;
}

export interface UpdateKeyEvent { 
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
  encryptedId: string; // For validation
  userId: string; // Expected user ID for validation
}

export interface SetPasswordRes {
  id: string;
  ok: true;
  encryptedPassword: string;
}

export interface CreateUserPasswordReq {
  id: string;
  cmd: "createUserPassword";
  password: string;
  userId: string;
}

export interface CreateUserPasswordRes {
  id: string;
  ok: true;
  encryptedPassword: string;
  encryptedId: string;
}

export interface BootstrapReq {
  id: string;
  cmd: "bootstrap";
  encryptedId: string;
  userId: string;
  encryptedPassword?: string; // Optional - if not provided, will need password input
  password?: string; // Optional - if encryptedPassword not available
}

export interface BootstrapRes {
  id: string;
  ok: true;
  needsPassword?: boolean; // True if password input is required
  encryptedPassword?: string; // New encrypted password to store
  isValid?: boolean; // True if validation succeeded
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

export interface ClearKeysReq {
  id: string;
  cmd: "clearKeys";
}

export interface ClearKeysRes {
  id: string;
  ok: true;
}

export interface EncryptFileReq {
  id: string;
  cmd: "encryptFile";
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
}

export interface EncryptFileRes {
  id: string;
  encryptedData: ArrayBuffer;
}

export interface DecryptFileReq {
  id: string;
  cmd: "decryptFile";
  encryptedData: ArrayBuffer;
  fileName: string;
  fileType: string;
}

export interface DecryptFileRes {
  id: string;
  decryptedData: ArrayBuffer;
}

export interface ErrorRes {
  id: string;
  error: string;
}

export type VaultRequest = DeriveReq | EncryptReq | DecryptReq | UpdateKeyEvent | SetPasswordReq | CreateUserPasswordReq | BootstrapReq | ClearKeysReq | EncryptFileReq | DecryptFileReq;
export type VaultResponse = DeriveRes | EncryptRes | DecryptRes | UpdateKeyRes | SetPasswordRes | CreateUserPasswordRes | BootstrapRes | ClearKeysRes | EncryptFileRes | DecryptFileRes | ErrorRes;

// API types for /deriveKey endpoint
export interface DeriveKeyResponse {
  oldKey: string | null; // Base64 encoded old key (null if password rotation needed)
  newKey: string; // Base64 encoded new key
}