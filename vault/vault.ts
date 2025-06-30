// Vault implementation - runs in sandboxed iframe
// Strict constraints: no DOM manipulation, no external deps, only postMessage and Web Crypto

import type {
  InitMsg,
  AckMsg,
  VaultRequest,
  VaultResponse,
  DeriveReq,
  DeriveRes,
  EncryptReq,
  EncryptRes,
  DecryptReq,
  DecryptRes,
  ErrorRes,
  DeriveKeyResponse,
} from './types';

// Rate limiting
interface RateLimitState {
  count: number;
  windowStart: number;
}

class VaultService {
  private port: MessagePort | null = null;
  private masterKey: CryptoKey | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private rateLimitState: RateLimitState = { count: 0, windowStart: Date.now() };
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly RATE_LIMIT_MAX = 100; // max operations per minute
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    addEventListener('message', (event: MessageEvent) => {
      if (event.data && event.data.cmd === 'init') {
        this.handleInit(event);
      }
    });
  }

  private handleInit(event: MessageEvent): void {
    const initMsg = event.data as InitMsg;
    if (initMsg.cmd !== 'init') {
      console.error('[Vault] Invalid init message');
      return;
    }

    // Get the MessagePort from the event
    const [port] = event.ports;
    if (!port) {
      console.error('[Vault] No MessagePort received');
      return;
    }

    this.port = port;
    this.port.onmessage = (e) => this.handlePortMessage(e);

    // Send acknowledgment
    const ackMsg: AckMsg = { ok: true };
    this.port.postMessage(ackMsg);

    console.log('[Vault] Initialized and acknowledged');
  }

  private async handlePortMessage(event: MessageEvent): Promise<void> {
    if (!this.port) {
      console.error('[Vault] Port not available');
      return;
    }

    const request = event.data as VaultRequest;
    let response: VaultResponse;

    try {
      // Check rate limiting
      if (!this.checkRateLimit()) {
        const errorResponse: ErrorRes = { id: request.id, error: 'locked' };
        this.port.postMessage(errorResponse);
        return;
      }

      // Reset idle timer
      this.resetIdleTimer();

      switch (request.cmd) {
        case 'derive':
          response = await this.handleDerive(request);
          break;
        case 'encrypt':
          response = await this.handleEncrypt(request);
          break;
        case 'decrypt':
          response = await this.handleDecrypt(request);
          break;
        default:
          // TypeScript can't narrow the request type in default case, so we assert it
          response = { id: (request as VaultRequest).id, error: 'unknown command' } as ErrorRes;
      }
    } catch (error) {
      console.error('[Vault] Error handling message:', error);
      response = {
        id: request.id,
        error: error instanceof Error ? error.message : 'unknown error'
      } as ErrorRes;
    }

    this.port.postMessage(response);
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.rateLimitState.windowStart >= this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitState.count = 0;
      this.rateLimitState.windowStart = now;
    }

    // Check if we've exceeded the limit
    if (this.rateLimitState.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    this.rateLimitState.count++;
    return true;
  }

  private resetIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      console.log('[Vault] Idle timeout reached, clearing key');
      this.clearKey();
    }, this.IDLE_TIMEOUT_MS);
  }

  private clearKey(): void {
    this.masterKey = null;
    console.log('[Vault] Master key cleared from memory');
  }

  private async handleDerive(request: DeriveReq): Promise<DeriveRes | ErrorRes> {
    try {
      await this.fetchAndUnwrapKey();
      return { id: request.id, ok: true };
    } catch (error) {
      console.error('[Vault] Key derivation failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'derivation failed'
      };
    }
  }

  private async handleEncrypt(request: EncryptReq): Promise<EncryptRes | ErrorRes> {
    if (!this.masterKey) {
      return { id: request.id, error: 'key not derived' };
    }

    try {
      const result = await this.aesEncrypt(this.masterKey, request.plain);
      return {
        id: request.id,
        ciphertext: result.ciphertext,
        iv: result.iv,
      };
    } catch (error) {
      console.error('[Vault] Encryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'encryption failed'
      };
    }
  }

  private async handleDecrypt(request: DecryptReq): Promise<DecryptRes | ErrorRes> {
    if (!this.masterKey) {
      return { id: request.id, error: 'key not derived' };
    }

    try {
      const plain = await this.aesDecrypt(this.masterKey, request.cipher, request.iv);
      return {
        id: request.id,
        plain,
      };
    } catch (error) {
      console.error('[Vault] Decryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'decryption failed'
      };
    }
  }

  private async fetchAndUnwrapKey(): Promise<void> {
    // TODO: This is a simplified version. In reality, you'd need:
    // 1. A device key pair (RSA-OAEP) stored securely
    // 2. Proper key unwrapping logic
    
    // For now, generate a temporary key for testing
    console.log('[Vault] Generating temporary AES key for testing');
    this.masterKey = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      false, // non-extractable
      ["encrypt", "decrypt"]
    );

    /*
    // Real implementation would look like:
    try {
      const response = await fetch('https://api.panda.chat/deriveKey', {
        method: 'POST',
        credentials: 'include', // Include HttpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DeriveKeyResponse = await response.json();
      const wrappedKeyBuffer = this.b64ToBuf(data.wrappedKey);
      
      // Unwrap using device private key
      this.masterKey = await this.unwrapKey(wrappedKeyBuffer, devicePrivateKey);
      
    } catch (error) {
      console.error('[Vault] Failed to fetch and unwrap key:', error);
      throw error;
    }
    */
  }

  // Crypto utilities (copied locally to avoid external deps)
  private async aesEncrypt(key: CryptoKey, plain: string): Promise<{
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
  }> {
    if (key.algorithm.name !== "AES-GCM") {
      throw new Error("Key must be AES-GCM");
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    return { ciphertext, iv: iv.buffer };
  }

  private async aesDecrypt(
    key: CryptoKey,
    cipher: ArrayBuffer,
    iv: ArrayBuffer
  ): Promise<string> {
    if (key.algorithm.name !== "AES-GCM") {
      throw new Error("Key must be AES-GCM");
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      cipher
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private async unwrapKey(
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
      { name: "RSA-OAEP" },
      { name: "AES-GCM", length: 256 },
      false, // non-extractable
      ["encrypt", "decrypt"]
    );
  }

  private b64ToBuf(b64: string): ArrayBuffer {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Initialize the vault service
console.log('[Vault] Starting vault service');
new VaultService();