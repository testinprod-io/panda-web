// Types and dependencies are included in the concatenated bundle

// Rate limiting
interface RateLimitState {
  count: number;
  windowStart: number;
}

class VaultService {
  private port: MessagePort | null = null;
  private passwordKey: CryptoKey | null = null; // Non-extractable password key for encryption
  private encryptionService: EncryptionService = new EncryptionService();
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
        console.log('[Vault] Received init command.');
        this.handleInit(event);
      }
    });
  }

  private handleInit(event: MessageEvent): void {
    const initMsg = event.data;
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
    const ackMsg = { ok: true, origin: self.origin };
    this.port.postMessage(ackMsg);

    console.log('[Vault] Initialized and acknowledged');
  }

  private async tryBootstrapPassword(encryptedPassword: string): Promise<void> {
    try {
      console.log('[Vault] Attempting to bootstrap password from stored encrypted password');
      
      // Get server keys as strings
      const { oldKey, newKey } = await this.fetchServerKeys();
      
      if (!oldKey) {
        console.log('[Vault] Server indicates password rotation needed - oldKey is null');
        return; // Need fresh password input
      }
      
      // Decrypt password and get CryptoKey
      const passwordPlain = await decryptPassword(encryptedPassword, oldKey);
      
      // Import password as CryptoKey for encryption operations
      this.passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passwordPlain),
        "PBKDF2",
        false,
        ["deriveKey", "deriveBits"]
      );
      
      // Re-encrypt with new key
      const newEncryptedPassword = await encryptPassword(passwordPlain, newKey);
      
      // Notify main app about the new encrypted password (key rotation)
      if (this.port && newEncryptedPassword !== encryptedPassword) {
        this.port.postMessage({
          cmd: 'passwordUpdated',
          encryptedPassword: newEncryptedPassword
        });
      }
      
      console.log('[Vault] Password bootstrapped successfully');
      this.resetIdleTimer();
    } catch (error) {
      console.log('[Vault] Failed to bootstrap password, user will need to input password:', error);
      // Not an error - just means we need fresh password input
    }
  }

  private async handlePortMessage(event: MessageEvent): Promise<void> {
    if (!this.port) {
      console.error('[Vault] Port not available');
      return;
    }

    const request = event.data;
    let response;

    try {
      // Check rate limiting
      if (!this.checkRateLimit()) {
        const errorResponse = { id: request.id, error: 'locked' };
        this.port.postMessage(errorResponse);
        return;
      }

      // Reset idle timer
      this.resetIdleTimer();

      switch (request.cmd) {
        case 'setPassword':
          response = await this.handleSetPassword(request);
          break;
        case 'updateKey':
          response = await this.handleUpdateKey(request);
          break;
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
          response = { id: request.id, error: 'unknown command' };
      }
    } catch (error) {
      console.error('[Vault] Error handling message:', error);
      response = {
        id: request.id,
        error: error instanceof Error ? error.message : 'unknown error'
      };
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
      console.log('[Vault] Idle timeout reached, clearing password');
      this.clearPassword();
    }, this.IDLE_TIMEOUT_MS);
  }

  private clearPassword(): void {
    this.passwordKey = null;
    console.log('[Vault] Password cleared from memory');
  }

  private async handleSetPassword(request: any): Promise<any> {
    try {
      // Get server keys as strings
      const { newKey } = await this.fetchServerKeys();
      
      // Encrypt the password with new server key
      const encryptedPassword = await encryptPassword(request.password, newKey);
      
      // Import password as CryptoKey for encryption operations
      this.passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(request.password),
        "PBKDF2",
        false,
        ["deriveKey", "deriveBits"]
      );
      
      console.log('[Vault] Password set and encrypted successfully');
      this.resetIdleTimer();
      
      return {
        id: request.id,
        ok: true,
        encryptedPassword
      };
    } catch (error) {
      console.error('[Vault] Failed to set password:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'password setup failed'
      };
    }
  }

  private async handleUpdateKey(request: any): Promise<any> {
    try {
      // Get server keys as strings
      const { oldKey, newKey } = await this.fetchServerKeys();
      
      if (!oldKey) {
        return {
          id: request.id,
          error: 'server key rotation required - password input needed'
        };
      }
      
      // Decrypt password 
      console.log('[Vault] Decrypting password with old key', request.encryptedPassword, "oldKey", oldKey);
      const passwordPlain = await decryptPassword(request.encryptedPassword, oldKey);
      
      // Import password as CryptoKey for encryption operations
      this.passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passwordPlain),
        "PBKDF2",
        false,
        ["deriveKey", "deriveBits"]
      );
      
      // Re-encrypt with new key
      const newEncryptedPassword = await encryptPassword(passwordPlain, newKey);
      
      console.log('[Vault] Password key updated successfully');
      this.resetIdleTimer();
      
      return {
        id: request.id,
        ok: true,
        newEncryptedPassword
      };
    } catch (error) {
      console.error('[Vault] Key update failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'key update failed'
      };
    }
  }

  private async handleDerive(request: any): Promise<any> {
    try {
      if (!this.passwordKey) {
        return { id: request.id, error: 'password not set' };
      }
      
      // Password CryptoKey is already available and ready for encryption operations
      console.log('[Vault] Password CryptoKey is ready for encryption operations');
      return { id: request.id, ok: true };
    } catch (error) {
      console.error('[Vault] Key derivation failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'derivation failed'
      };
    }
  }

  private async handleEncrypt(request: any): Promise<any> {
    if (!this.passwordKey) {
      return { id: request.id, error: 'password not set' };
    }

    try {
      // Use the CryptoKey to encrypt with PBKDF2 + AES-GCM
      const encrypted = await this.encryptWithPasswordKey(request.plain, this.passwordKey);
      
      return {
        id: request.id,
        encrypted
      };
    } catch (error) {
      console.error('[Vault] Encryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'encryption failed'
      };
    }
  }

  private async handleDecrypt(request: any): Promise<any> {
    if (!this.passwordKey) {
      return { id: request.id, error: 'password not set' };
    }

    try {
      // Use the CryptoKey to decrypt with PBKDF2 + AES-GCM
      const plain = await this.decryptWithPasswordKey(request.encrypted, this.passwordKey);
      
      return {
        id: request.id,
        plain
      };
    } catch (error) {
      console.error('[Vault] Decryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'decryption failed'
      };
    }
  }

  private async encryptWithPasswordKey(plaintext: string, passwordKey: CryptoKey): Promise<string> {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive AES key from password using PBKDF2
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    // Encrypt the plaintext
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      new TextEncoder().encode(plaintext)
    );
    
    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    // Return base64url encoded result
    return this.base64urlEncode(combined);
  }

  private async decryptWithPasswordKey(encryptedData: string, passwordKey: CryptoKey): Promise<string> {
    // Decode the encrypted data
    const combined = this.base64urlDecode(encryptedData);
    
    // Extract salt, iv, and ciphertext
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    
    // Derive AES key from password using PBKDF2
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    // Decrypt the ciphertext
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertext
    );
    
    return new TextDecoder().decode(plaintext);
  }

  private async fetchServerKeys(): Promise<{ oldKey: string | null; newKey: string }> {
    try {
      // Make same-origin request to our local BFF API
      const deriveKeyUrl = '/api/vault/deriveKey';
      
      console.log('[Vault] Fetching server keys from local BFF:', deriveKeyUrl);
      
      const response = await fetch(deriveKeyUrl, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Vault] Received server keys from BFF');
      
      return { oldKey: data.old_key, newKey: data.new_key };
      
    } catch (error) {
      console.error('[Vault] Failed to fetch server keys:', error);
      throw error;
    }
  }

  private base64urlEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private base64urlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  }

  private base64ToUint8Array(keyString: string): Uint8Array {
    console.log('[Vault] Converting string to Uint8Array:', keyString);
    
    // First encode the string as base64, then decode it to Uint8Array
    const base64Encoded = btoa(keyString);
    const binary = atob(base64Encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

// Initialize the vault service
console.log('[Vault] Vault script loaded. Waiting for init message...');
new VaultService();