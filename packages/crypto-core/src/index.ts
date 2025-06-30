// Minimal cryptographic primitives using native Web Crypto API
// No external dependencies - security through simplicity

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Encrypts plaintext using AES-GCM with a random IV
 */
export async function aesEncrypt(
  key: CryptoKey,
  plain: string
): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> {
  if (key.algorithm.name !== ALGORITHM) {
    throw new Error('Invalid key algorithm - expected AES-GCM');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  
  // Generate random IV
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

/**
 * Decrypts ciphertext using AES-GCM
 */
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

/**
 * Wraps a data key using RSA-OAEP
 */
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

/**
 * Unwraps a data key using RSA-OAEP, returns non-extractable AES key
 */
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

/**
 * Generates a new AES-GCM key (for testing/development)
 */
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

/**
 * Generates RSA-OAEP key pair (for testing/development)
 */
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

/**
 * Converts ArrayBuffer to base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to ArrayBuffer
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}