// Protocol messages for secure vault communication

export interface InitMsg {
  cmd: 'init';
}

export interface AckMsg {
  ok: true;
}

export interface DeriveReq {
  id: string;
  cmd: 'derive';
}

export interface DeriveRes {
  id: string;
  ok: true;
}

export interface EncryptReq {
  id: string;
  cmd: 'encrypt';
  plain: string;
}

export interface EncryptRes {
  id: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
}

export interface DecryptReq {
  id: string;
  cmd: 'decrypt';
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

// Union types for message handling
export type VaultRequest = DeriveReq | EncryptReq | DecryptReq;
export type VaultResponse = DeriveRes | EncryptRes | DecryptRes | ErrorRes;
export type VaultMessage = InitMsg | AckMsg | VaultRequest | VaultResponse;

// Type guards
export function isInitMsg(msg: any): msg is InitMsg {
  return msg && msg.cmd === 'init';
}

export function isAckMsg(msg: any): msg is AckMsg {
  return msg && msg.ok === true;
}

export function isDeriveReq(msg: any): msg is DeriveReq {
  return msg && msg.cmd === 'derive' && typeof msg.id === 'string';
}

export function isEncryptReq(msg: any): msg is EncryptReq {
  return msg && msg.cmd === 'encrypt' && typeof msg.id === 'string' && typeof msg.plain === 'string';
}

export function isDecryptReq(msg: any): msg is DecryptReq {
  return msg && msg.cmd === 'decrypt' && typeof msg.id === 'string' && msg.cipher instanceof ArrayBuffer && msg.iv instanceof ArrayBuffer;
}

export function isErrorRes(msg: any): msg is ErrorRes {
  return msg && typeof msg.id === 'string' && typeof msg.error === 'string';
}