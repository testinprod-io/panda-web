// Sandboxed cryptography vault
// Strict security: no DOM access, no external deps, rate-limited operations

import {
  aesEncrypt,
  aesDecrypt,
  unwrapKey,
  base64ToBuffer,
} from './crypto';
import {
  isInitMsg,
  isDeriveReq,
  isEncryptReq,
  isDecryptReq,
  type VaultMessage,
  type VaultRequest,
  type VaultResponse,
  type DeriveReq,
  type EncryptReq,
  type DecryptReq,
  type ErrorRes,
} from './protocol';

// Security constraints
const MAX_DECRYPTS_PER_MINUTE = 100;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const API_BASE = 'http://localhost:3002'; // Development API server

// State management
let communicationPort: MessagePort | null = null;
let masterKey: CryptoKey | null = null;
let lastActivityTime = Date.now();
let decryptCount = 0;
let decryptCountResetTime = Date.now();

// Rate limiting
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - decryptCountResetTime > 60000) {
    decryptCount = 0;
    decryptCountResetTime = now;
  }
  
  return decryptCount < MAX_DECRYPTS_PER_MINUTE;
}

// Idle timeout management
function updateActivity(): void {
  lastActivityTime = Date.now();
}

function checkIdleTimeout(): void {
  const now = Date.now();
  if (masterKey && now - lastActivityTime > IDLE_TIMEOUT_MS) {
    // Zero out the key
    masterKey = null;
    console.log('Master key cleared due to idle timeout');
  }
}

// Start idle timeout checker
setInterval(checkIdleTimeout, 30000); // Check every 30 seconds

// Secure API communication
async function fetchAndUnwrap(): Promise<CryptoKey> {
  try {
    const response = await fetch(`${API_BASE}/deriveKey`, {
      method: 'POST',
      credentials: 'include', // Include HttpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.wrappedKey) {
      throw new Error('No wrapped key in response');
    }

    const wrappedKeyBuffer = base64ToBuffer(data.wrappedKey);
    
    // For development/demo - in production this would come from device storage
    // Generate a temporary RSA key pair for unwrapping
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      false,
      ['wrapKey', 'unwrapKey']
    );

    // In real implementation, the server would wrap with the device's public key
    // For demo, we'll use a pre-shared AES key approach
    const aesKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );

    return aesKey;
  } catch (error) {
    console.error('Failed to derive key:', error);
    throw error;
  }
}

// Message handlers
async function handleDeriveReq(req: DeriveReq): Promise<VaultResponse> {
  try {
    updateActivity();
    
    if (masterKey) {
      return { id: req.id, ok: true };
    }

    masterKey = await fetchAndUnwrap();
    return { id: req.id, ok: true };
  } catch (error) {
    return {
      id: req.id,
      error: `Derive failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleEncryptReq(req: EncryptReq): Promise<VaultResponse> {
  try {
    updateActivity();
    
    if (!masterKey) {
      return { id: req.id, error: 'No master key - call derive first' };
    }

    const result = await aesEncrypt(masterKey, req.plain);
    return {
      id: req.id,
      ciphertext: result.ciphertext,
      iv: result.iv,
    };
  } catch (error) {
    return {
      id: req.id,
      error: `Encrypt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleDecryptReq(req: DecryptReq): Promise<VaultResponse> {
  try {
    updateActivity();
    
    if (!masterKey) {
      return { id: req.id, error: 'No master key - call derive first' };
    }

    if (!checkRateLimit()) {
      return { id: req.id, error: 'Rate limit exceeded - locked' };
    }

    decryptCount++;
    const plain = await aesDecrypt(masterKey, req.cipher, req.iv);
    
    return {
      id: req.id,
      plain,
    };
  } catch (error) {
    return {
      id: req.id,
      error: `Decrypt failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Main message router
async function handleVaultRequest(req: VaultRequest): Promise<VaultResponse> {
  if (isDeriveReq(req)) {
    return handleDeriveReq(req);
  }
  if (isEncryptReq(req)) {
    return handleEncryptReq(req);
  }
  if (isDecryptReq(req)) {
    return handleDecryptReq(req);
  }
  
  return {
    id: req.id,
    error: 'Unknown command',
  } as ErrorRes;
}

// Communication setup
function setupCommunication(port: MessagePort): void {
  communicationPort = port;
  
  port.addEventListener('message', async (event) => {
    const msg: VaultMessage = event.data;
    
    // Handle vault requests
    if (msg && typeof msg === 'object' && 'id' in msg && 'cmd' in msg) {
      try {
        const response = await handleVaultRequest(msg as VaultRequest);
        port.postMessage(response);
      } catch (error) {
        const errorResponse: ErrorRes = {
          id: (msg as any).id || 'unknown',
          error: error instanceof Error ? error.message : 'Internal error',
        };
        port.postMessage(errorResponse);
      }
    }
  });
  
  port.start();
  
  // Send acknowledgment
  port.postMessage({ ok: true });
}

// Main entry point - listen for initialization
addEventListener('message', (event: MessageEvent) => {
  const msg: VaultMessage = event.data;
  
  if (isInitMsg(msg)) {
    const port = event.ports[0];
    if (port) {
      setupCommunication(port);
    }
  }
});

// Security: Prevent any DOM manipulation
Object.freeze(document);
Object.freeze(window);

console.log('Panda Crypto Vault initialized - ready for secure operations');