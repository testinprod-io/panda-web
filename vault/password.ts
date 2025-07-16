// crypto-helper.ts ----------------------------------------------------------
const enc = new TextEncoder();
const dec = new TextDecoder();
const VERSION = 1;
const FLAG_HKDF = 0b00000001;

async function importServerKey(raw32: Uint8Array): Promise<CryptoKey> {
  // Non-extractable, can only be used → prevents accidental leak to console
  return crypto.subtle.importKey(
    "raw",
    raw32,
    "HKDF", // we'll HKDF → AES later
    false,
    ["deriveKey"]
  );
}

async function deriveAesKey(
  serverKey: CryptoKey,
  salt: Uint8Array | null
): Promise<CryptoKey> {
  if (!salt) {
    // No HKDF: fall back to direct AES key
    return crypto.subtle.importKey(
      "raw",
      await crypto.subtle.exportKey("raw", serverKey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: enc.encode("pwd-storage"),
    },
    serverKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Export functions for vault usage
async function encryptPassword(
  password: string,
  serverKeyString: string
): Promise<string> {
  // Generate random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Convert server key string directly to AES key
  const serverKeyBytes = base64urlDecode(serverKeyString);

  // Validate key length
  if (serverKeyBytes.length !== 32) {
    throw new Error(
      `Server key must be 32 bytes, got ${serverKeyBytes.length} bytes`
    );
  }

  // Import as AES-GCM key directly (no HKDF needed since server key rotates)
  const aesKey = await crypto.subtle.importKey(
    "raw",
    serverKeyBytes,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );

  // Encrypt the password
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(password)
  );

  // Simple format: IV + ciphertext (no salt needed since server key rotates)
  const envelope = new Uint8Array(iv.length + ciphertext.byteLength);
  envelope.set(iv, 0);
  envelope.set(new Uint8Array(ciphertext), iv.length);

  return base64urlEncode(envelope);
}

async function decryptPassword(
  envelopeB64: string,
  serverKeyString: string
): Promise<string> {
  const envelope = base64urlDecode(envelopeB64);

  // Check if this is the old format (starts with version byte)
  if (envelope.length > 2 && envelope[0] === VERSION) {
    return await decryptPasswordLegacy(envelopeB64, serverKeyString);
  }

  // New simple format: IV (12 bytes) + ciphertext
  if (envelope.length < 12) {
    throw new Error("Invalid encrypted password format: too short");
  }

  const iv = envelope.slice(0, 12);
  const ciphertext = envelope.slice(12);

  // Convert server key string directly to AES key
  const serverKeyBytes = base64urlDecode(serverKeyString);

  // Validate key length
  if (serverKeyBytes.length !== 32) {
    throw new Error(
      `Server key must be 32 bytes, got ${serverKeyBytes.length} bytes`
    );
  }

  // Import as AES-GCM key directly
  const aesKey = await crypto.subtle.importKey(
    "raw",
    serverKeyBytes,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );

  // Decrypt the password
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext
  );

  return dec.decode(plaintext);
}

// Legacy decryption for backward compatibility
async function decryptPasswordLegacy(
  envelopeB64: string,
  serverKeyString: string
): Promise<string> {
  const blob = base64urlDecode(envelopeB64);

  let offset = 0;
  const opts = blob[offset++];

  if (opts !== VERSION) throw new Error("unsupported legacy format");

  const useHKDF = (opts & FLAG_HKDF) !== 0;
  const salt = useHKDF ? blob.slice(offset, (offset += 16)) : null;
  const iv = blob.slice(offset, (offset += 12));
  const cipher = blob.slice(offset); // includes GCM tag

  // Convert serverKey string to Uint8Array and then to CryptoKey
  const serverKeyBytes = base64urlDecode(serverKeyString);
  const serverKey = await importServerKey(serverKeyBytes);
  const aesKey = await deriveAesKey(serverKey, salt);

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode("PWDv1") },
    aesKey,
    cipher
  );

  return dec.decode(plainBuf);
}

// --- helpers ---------------------------------------------------------------
function base64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
