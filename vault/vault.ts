interface RateLimitState {
  count: number;
  windowStart: number;
}

class VaultService {
  private port: MessagePort | null = null;
  private passwordKey: CryptoKey | null = null; // Non-extractable password key for encryption
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private rateLimitState: RateLimitState = { count: 0, windowStart: Date.now() };
  private readonly IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  private readonly RATE_LIMIT_MAX = 100; // max operations per minute
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  
  // Store for validation
  private encryptedId: string | null = null;
  private expectedUserId: string | null = null;
  private accessToken: string | null = null;

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

    // Store validation data if provided
    if (initMsg.encryptedId) {
      this.encryptedId = initMsg.encryptedId;
    }
    if (initMsg.userId) {
      this.expectedUserId = initMsg.userId;
    }
    if (initMsg.accessToken) {
      this.accessToken = initMsg.accessToken;
    }

    // Send acknowledgment
    const ackMsg = { ok: true, origin: self.origin };
    this.port.postMessage(ackMsg);

    console.log('[Vault] Initialized and acknowledged');
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
        case 'bootstrap':
          response = await this.handleBootstrap(request);
          break;
        case 'setPassword':
          response = await this.handleSetPassword(request);
          break;
        case 'createUserPassword':
          response = await this.handleCreateUserPassword(request);
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
        case 'clearKeys':
          response = await this.handleClearKeys(request);
          break;
        case 'encryptFile':
          response = await this.handleEncryptFile(request);
          break;
        case 'decryptFile':
          response = await this.handleDecryptFile(request);
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
    this.encryptedId = null;
    this.expectedUserId = null;
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    console.log('[Vault] Password and validation data cleared from memory');  
  }

  private async handleSetPassword(request: any): Promise<any> {
    try {
      console.log('[Vault] Setting password with validation');
      
      // First, validate the password against the provided encryptedId
      const isValidPassword = await this.validatePasswordAgainstEncryptedId(
        request.password, 
        request.encryptedId, 
        request.userId
      );
      
      if (!isValidPassword) {
        console.log('[Vault] Password validation failed');
        return {
          id: request.id,
          error: 'Invalid password'
        };
      }
      
      console.log('[Vault] Password validation successful, proceeding to set password');
      
      // Get server keys and encrypt the password for storage
      const { newKey } = await this.fetchServerKeys();
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

  private async handleCreateUserPassword(request: any): Promise<any> {
    try {
      console.log('[Vault] Creating user password and encrypting user ID');
      
      // Import password as CryptoKey for encryption operations
      this.passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(request.password),
        "PBKDF2",
        false,
        ["deriveKey", "deriveBits"]
      );
      
      // Encrypt the user ID with the password
      const encryptedId = this.generateEncryptedId(request.password, request.userId);
      
      // Call server to create/update the encryptedId
      await this.createEncryptedIdOnServer(encryptedId);
      
      // Get server keys and encrypt the password for storage
      const { newKey } = await this.fetchServerKeys();
      const encryptedPassword = await encryptPassword(request.password, newKey);
      
      console.log('[Vault] User password created, ID encrypted, and stored on server');
      this.resetIdleTimer();
      
      return {
        id: request.id,
        ok: true,
        encryptedPassword,
        encryptedId
      };
    } catch (error) {
      console.error('[Vault] Failed to create user password:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'password creation failed'
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

  private async handleBootstrap(request: any): Promise<any> {
    try {
      console.log('[Vault] Bootstrap request received');
      
      // Store validation data from request
      this.encryptedId = request.encryptedId;
      this.expectedUserId = request.userId;
      
      let password: string;
      let newEncryptedPassword: string | undefined;
      
      if (request.encryptedPassword) {
        // Try to decrypt stored password
        console.log('[Vault] Attempting to use stored encrypted password');
        
        try {
          const { oldKey, newKey } = await this.fetchServerKeys();
          
          if (!oldKey) {
            console.log('[Vault] No oldKey available, requiring password input');
            return {
              id: request.id,
              ok: true,
              needsPassword: true
            };
          }
          
          // Decrypt password with old key
          console.log('[Vault] Decrypting password with old key');
          password = await decryptPassword(request.encryptedPassword, oldKey);
          console.log('[Vault] Successfully decrypted password');
          
          // Re-encrypt with new key
          newEncryptedPassword = await encryptPassword(password, newKey);
          console.log('[Vault] Successfully re-encrypted password');
          
        } catch (decryptError) {
          console.error('[Vault] Failed to decrypt stored password:', decryptError);
          console.log('[Vault] Stored password may be corrupted or from old format, requiring fresh password input');
          return {
            id: request.id,
            ok: true,
            needsPassword: true
          };
        }
        
      } else if (request.password) {
        // Use provided password
        console.log('[Vault] Using provided password');
        password = request.password;
        
        try {
          // Encrypt password for storage
          const { newKey } = await this.fetchServerKeys();
          newEncryptedPassword = await encryptPassword(password, newKey);
          console.log('[Vault] Successfully encrypted provided password');
        } catch (encryptError) {
          console.error('[Vault] Failed to encrypt provided password:', encryptError);
          throw new Error('Failed to encrypt password for storage');
        }
        
      } else {
        // Need password input
        console.log('[Vault] No password or encrypted password provided, requiring input');
        return {
          id: request.id,
          ok: true,
          needsPassword: true
        };
      }
      
      // Validate password by decrypting encryptedId
      console.log('[Vault] Validating password against encryptedId');
      try {
        const isValid = await this.validatePassword(password);
        console.log('[Vault] Password validation result:', isValid);
        
        if (!isValid) {
          return {
            id: request.id,
            ok: true,
            isValid: false
          };
        }
      } catch (validateError) {
        console.error('[Vault] Password validation failed:', validateError);
        return {
          id: request.id,
          ok: true,
          isValid: false
        };
      }
      
      // Store password as CryptoKey for future operations
      try {
        this.passwordKey = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(password),
          "PBKDF2",
          false,
          ["deriveKey", "deriveBits"]
        );
        console.log('[Vault] Successfully imported password as CryptoKey');
      } catch (importError) {
        console.error('[Vault] Failed to import password as CryptoKey:', importError);
        throw new Error('Failed to import password as CryptoKey');
      }
      
      console.log('[Vault] Bootstrap successful, password validated and stored');
      this.resetIdleTimer();
      
      return {
        id: request.id,
        ok: true,
        isValid: true,
        encryptedPassword: newEncryptedPassword
      };
      
    } catch (error) {
      console.error('[Vault] Bootstrap failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'bootstrap failed'
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
      console.log('[Vault] Encryption failed:', error);
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
      console.log('[Vault] Decryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'decryption failed'
      };
    }
  }

  private async handleClearKeys(request: any): Promise<any> {
    try {
      console.log('[Vault] Clearing keys from memory...');
      this.clearPassword();
      return { id: request.id, ok: true };
    } catch (error) {
      console.error('[Vault] Failed to clear keys:', error);
      return { id: request.id, error: error instanceof Error ? error.message : 'clearKeys failed' };
    }
  }

  private async handleEncryptFile(request: any): Promise<any> {
    if (!this.passwordKey) {
      return { id: request.id, error: 'password not set' };
    }

    try {
      // Encrypt file data using the password key
      const encryptedData = await this.encryptFileWithPasswordKey(request.fileData, this.passwordKey);
      
      return {
        id: request.id,
        encryptedData
      };
    } catch (error) {
      console.log('[Vault] File encryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'file encryption failed'
      };
    }
  }

  private async handleDecryptFile(request: any): Promise<any> {
    if (!this.passwordKey) {
      return { id: request.id, error: 'password not set' };
    }

    try {
      // Decrypt file data using the password key
      const decryptedData = await this.decryptFileWithPasswordKey(request.encryptedData, this.passwordKey);
      
      return {
        id: request.id,
        decryptedData
      };
    } catch (error) {
      console.error('[Vault] File decryption failed:', error);
      return {
        id: request.id,
        error: error instanceof Error ? error.message : 'file decryption failed'
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

  private generateLegacyPassword(password: string): {
    key: CryptoJS.lib.WordArray;
    iv: CryptoJS.lib.WordArray;
  } {
    if (!password) {
      throw new Error("Cannot generate key from empty password");
    }

    // Use a known string as a constant "pepper" instead of a random salt
    // Note: this is less secure than using a random salt
    const pepper = "PandaAI-Static-Pepper-2023";

    // Use PBKDF2 to derive a key
    const derivedKey = CryptoJS.PBKDF2(password, pepper, {
      keySize: 256 / 32, // 256 bits
      iterations: 1000,
    });

    // Use first half for key, second half for IV
    const keyWords = derivedKey.words;
    const keyHalfLength = keyWords.length / 2;

    const keyBytes = keyWords.slice(0, keyHalfLength);
    const ivBytes = keyWords.slice(keyHalfLength);

    const key = CryptoJS.lib.WordArray.create(keyBytes);
    const iv = CryptoJS.lib.WordArray.create(ivBytes);

    return { key, iv };
  }

  private generateEncryptedId(password: string, userId: string): string {
    const { key, iv } = this.generateLegacyPassword(password);
    const encryptedId = CryptoJS.AES.encrypt(userId, key, { iv: iv }).toString();
    return encryptedId;
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

  private async encryptFileWithPasswordKey(fileData: ArrayBuffer, passwordKey: CryptoKey): Promise<ArrayBuffer> {
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

    // Encrypt the file data
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      fileData
    );

    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return combined.buffer;
  }

  private async decryptFileWithPasswordKey(encryptedData: ArrayBuffer, passwordKey: CryptoKey): Promise<ArrayBuffer> {
    // Decode the encrypted data
    const combined = new Uint8Array(encryptedData);

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
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      ciphertext
    );

    return decrypted;
  }

  private async fetchServerKeys(): Promise<{ oldKey: string | null; newKey: string }> {
    try {
      // Make same-origin request to our local BFF API
      const deriveKeyUrl = '/api/vault/deriveKey';
      
      console.log('[Vault] Fetching server keys from local BFF:', deriveKeyUrl);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      
      const response = await fetch(deriveKeyUrl, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate server key format
      if (data.new_key) {
        console.log('[Vault] New key length:', data.new_key.length, 'characters');
        try {
          const decoded = this.base64urlDecode(data.new_key);
          console.log('[Vault] New key decoded to:', decoded.length, 'bytes');
          if (decoded.length !== 32) {
            console.warn('[Vault] Server key is not 32 bytes!', decoded.length);
          }
        } catch (e) {
          console.error('[Vault] Server key is not valid base64:', e);
          throw new Error('Invalid server key format');
        }
      }
      
      if (data.old_key) {
        console.log('[Vault] Old key length:', data.old_key.length, 'characters');
        try {
          const decoded = this.base64urlDecode(data.old_key);
          console.log('[Vault] Old key decoded to:', decoded.length, 'bytes');
        } catch (e) {
          console.error('[Vault] Old server key is not valid base64:', e);
        }
      }
      
      console.log('[Vault] Received server keys from BFF');
      
      return { oldKey: data.old_key, newKey: data.new_key };
      
    } catch (error) {
      console.error('[Vault] Failed to fetch server keys:', error);
      throw error;
    }
  }

  private async createEncryptedIdOnServer(encryptedId: string): Promise<void> {
    try {
      // Make same-origin request to our local BFF API
      const createEncryptedIdUrl = '/api/vault/createEncryptedId';
      
      console.log('[Vault] Creating encrypted ID on server via BFF:', createEncryptedIdUrl);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      
      const response = await fetch(createEncryptedIdUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ encrypted_id: encryptedId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[Vault] Encrypted ID created on server successfully');
      
    } catch (error) {
      console.error('[Vault] Failed to create encrypted ID on server:', error);
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
    try {
      str = str.replace(/-/g, "+").replace(/_/g, "/");
      while (str.length % 4) str += "=";
      return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
    } catch (error) {
      console.log('[Vault] Failed to decode base64url string:', error);
      throw new Error('Invalid base64url encoded data');
    }
  }

  private async validatePassword(password: string): Promise<boolean> {
    if (!this.encryptedId || !this.expectedUserId) {
      console.log('[Vault] No encryptedId or expectedUserId available for validation');
      return false;
    }

    return this.validatePasswordAgainstEncryptedId(password, this.encryptedId, this.expectedUserId);
  }

  private async validatePasswordAgainstEncryptedId(password: string, encryptedId: string, expectedUserId: string): Promise<boolean> {
    try {
      console.log('[Vault] Validating password by decrypting encryptedId');
      
      const expectedEncryptedId = this.generateEncryptedId(password, expectedUserId);
      
      // Compare with expected userId
      const isValid = expectedEncryptedId === encryptedId;
      
      console.log('[Vault] Password validation result:', isValid);
      return isValid;
      
    } catch (error) {
      console.error('[Vault] Password validation failed:', error);
      return false;
    }
  }
}

// Initialize the vault service
console.log('[Vault] Vault script loaded. Waiting for init message...');
new VaultService();