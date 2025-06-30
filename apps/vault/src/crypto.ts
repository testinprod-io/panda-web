// Local crypto utilities for vault (copied from crypto-core)
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

export async function aesEncrypt(
  key: CryptoKey,
  plain: string
): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  if (key.algorithm.name !== ALGORITHM) {
    throw new Error('Invalid key algorithm - expected AES-GCM');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    data
  );

  return {
    ciphertext,
    iv: iv.buffer,
  };
}

export async function aesDecrypt(
  key: CryptoKey,
  cipher: ArrayBuffer,
  iv: ArrayBuffer
): Promise<string> {
  if (key.algorithm.name !== ALGORITHM) {
    throw new Error('Invalid key algorithm - expected AES-GCM');
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    cipher
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function unwrapKey(
  wrapped: ArrayBuffer,
  wrappingPriv: CryptoKey
): Promise<CryptoKey> {
  if (wrappingPriv.algorithm.name !== 'RSA-OAEP') {
    throw new Error('Invalid unwrapping key algorithm - expected RSA-OAEP');
  }

  return crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    wrappingPriv,
    {
      name: 'RSA-OAEP',
    },
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}