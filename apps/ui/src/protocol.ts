// Local protocol types for UI (copied from shared-proto)
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

export type VaultRequest = DeriveReq | EncryptReq | DecryptReq;
export type VaultResponse = DeriveRes | EncryptRes | DecryptRes | ErrorRes;
export type VaultMessage = InitMsg | AckMsg | VaultRequest | VaultResponse;

export function isAckMsg(msg: any): msg is AckMsg {
  return msg && msg.ok === true;
}

export function isErrorRes(msg: any): msg is ErrorRes {
  return msg && typeof msg.id === 'string' && typeof msg.error === 'string';
}