// Minimal crypto utilities using Web Crypto API only

/**
 * Encrypts a plaintext string using AES-GCM
 * @param key - The AES-GCM key (non-extractable)
 * @param plain - The plaintext string to encrypt
 * @returns Object containing ciphertext and IV as ArrayBuffers
 */
export async function aesEncrypt(key: CryptoKey, plain: string): Promise<{
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
}> {
  if (key.algorithm.name !== "AES-GCM") {
    throw new Error("Key must be AES-GCM");
  }

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  // Convert string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
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
 * @param key - The AES-GCM key (non-extractable)
 * @param cipher - The ciphertext as ArrayBuffer
 * @param iv - The IV as ArrayBuffer
 * @returns Decrypted plaintext string
 */
export async function aesDecrypt(
  key: CryptoKey,
  cipher: ArrayBuffer,
  iv: ArrayBuffer
): Promise<string> {
  if (key.algorithm.name !== "AES-GCM") {
    throw new Error("Key must be AES-GCM");
  }

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    cipher
  );

  // Convert bytes back to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Wraps an AES key using RSA-OAEP
 * @param dataKey - The AES key to wrap
 * @param wrappingPub - The RSA public key for wrapping
 * @returns Wrapped key as ArrayBuffer
 */
export async function wrapKey(
  dataKey: CryptoKey,
  wrappingPub: CryptoKey
): Promise<ArrayBuffer> {
  if (wrappingPub.algorithm.name !== "RSA-OAEP") {
    throw new Error("Wrapping key must be RSA-OAEP");
  }

  return await crypto.subtle.wrapKey(
    "raw",
    dataKey,
    wrappingPub,
    {
      name: "RSA-OAEP",
    }
  );
}

/**
 * Unwraps a wrapped AES key using RSA-OAEP
 * @param wrapped - The wrapped key as ArrayBuffer
 * @param wrappingPriv - The RSA private key for unwrapping
 * @returns Unwrapped AES-GCM key (non-extractable)
 */
export async function unwrapKey(
  wrapped: ArrayBuffer,
  wrappingPriv: CryptoKey
): Promise<CryptoKey> {
  if (wrappingPriv.algorithm.name !== "RSA-OAEP") {
    throw new Error("Unwrapping key must be RSA-OAEP");
  }

  return await crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    wrappingPriv,
    {
      name: "RSA-OAEP",
    },
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a new AES-GCM key for testing/development
 * @returns Non-extractable AES-GCM key
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates an RSA-OAEP key pair for testing/development
 * @returns RSA-OAEP key pair
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    false, // non-extractable
    ["wrapKey", "unwrapKey"]
  );
}

/**
 * Converts ArrayBuffer to Base64 string
 */
export function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to ArrayBuffer
 */
export function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}