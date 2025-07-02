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
      // For local development, we can be more lenient.
      // In production, this should be locked down to your app's origin.
      // const isDevelopment = event.origin.includes('localhost');
      // const expectedOrigin = isDevelopment
      //   ? 'http://localhost:3000'
      //   : 'https://app.panda.chat'; // Your production app URL

      // console.log(`[Vault] Received message from origin: ${event.origin}. Expecting: ${expectedOrigin}.`);

      // if (event.origin !== expectedOrigin) {
      //   console.warn(`[Vault] Ignoring message from unexpected origin.`);
      //   return;
      // }

      if (event.data && event.data.cmd === 'init') {
        console.log('[Vault] Received init command.');
        this.handleInit(event);
      }
    });
  }

  private accessToken: string | null = null;

  private handleInit(event: MessageEvent): void {
    const initMsg = event.data as InitMsg;
    if (initMsg.cmd !== 'init') {
      console.error('[Vault] Invalid init message');
      return;
    }

    // Store the access token for API requests (no need for appOrigin with same-origin requests)
    this.accessToken = initMsg.accessToken || null;
    console.log('[Vault] Received access token:', this.accessToken ? 'YES' : 'NO');

    // Get the MessagePort from the event
    const [port] = event.ports;
    if (!port) {
      console.error('[Vault] No MessagePort received');
      return;
    }

    this.port = port;
    this.port.onmessage = (e) => this.handlePortMessage(e);

    // Send acknowledgment
    const ackMsg: AckMsg = { ok: true, origin: self.origin };
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
    // Real implementation that fetches wrapped key from local BFF (same-origin)
    try {
      if (!this.accessToken) {
        throw new Error('Access token not available - vault not properly initialized');
      }
      
      // Make same-origin request to our local BFF API
      const deriveKeyUrl = '/api/vault/deriveKey';
      
      console.log('[Vault] Fetching wrapped key from local BFF:', deriveKeyUrl);
      
      const response = await fetch(deriveKeyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`, // Use access token directly
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DeriveKeyResponse = await response.json();
      console.log('[Vault] Received wrapped key from BFF');
      
      // For now, since we're getting a mock wrapped key, we'll generate a temporary key
      // In a real implementation, you would:
      // 1. Have a device key pair (RSA-OAEP) stored securely
      // 2. Unwrap the actual key using: await this.unwrapKey(wrappedKeyBuffer, devicePrivateKey);
      
      console.log('[Vault] Mock implementation - generating temporary AES key');
      this.masterKey = await crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        false, // non-extractable
        ["encrypt", "decrypt"]
      );
      
      console.log('[Vault] Key derivation successful');
      
    } catch (error) {
      console.error('[Vault] Failed to fetch and unwrap key:', error);
      throw error;
    }
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
console.log('[Vault] Vault script loaded. Waiting for init message...');
new VaultService();