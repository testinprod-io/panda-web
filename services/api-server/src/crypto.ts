// Local crypto utilities for API server (copied from crypto-core)
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );
}

export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  );
}

export async function wrapKey(
  dataKey: CryptoKey,
  wrappingPub: CryptoKey
): Promise<ArrayBuffer> {
  if (wrappingPub.algorithm.name !== 'RSA-OAEP') {
    throw new Error('Invalid wrapping key algorithm - expected RSA-OAEP');
  }

  return crypto.subtle.wrapKey(
    'raw',
    dataKey,
    wrappingPub,
    {
      name: 'RSA-OAEP',
    }
  );
}

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}