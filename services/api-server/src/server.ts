// Mock API server for vault key derivation
import { Crypto } from '@peculiar/webcrypto';
import express from 'express';
import cors from 'cors';
import { generateAesKey, wrapKey, generateRsaKeyPair, bufferToBase64 } from './crypto.js';

// Polyfill Web Crypto API for Node.js if needed
if (!global.crypto) {
  global.crypto = new Crypto();
}

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration for development
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Mock session storage (in production this would be Redis/DB)
const mockSessions = new Map<string, { 
  userId: string; 
  devicePubKey: string;
  authenticated: boolean;
}>();

// Mock user data
const mockUsers = new Map([
  ['demo-user', {
    id: 'demo-user',
    deviceKeyPair: null as CryptoKeyPair | null,
  }]
]);

// Initialize demo user with RSA key pair
async function initializeDemoUser() {
  const user = mockUsers.get('demo-user')!;
  if (!user.deviceKeyPair) {
    user.deviceKeyPair = await generateRsaKeyPair();
    console.log('✅ Demo user RSA key pair generated');
  }
}

// Mock session middleware
const requireSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // In development, we'll simulate an authenticated session
  const sessionId = req.headers['x-session-id'] as string || 'demo-session';
  
  // Create or get session
  if (!mockSessions.has(sessionId)) {
    mockSessions.set(sessionId, {
      userId: 'demo-user',
      devicePubKey: 'demo-device-key',
      authenticated: true,
    });
  }

  const session = mockSessions.get(sessionId)!;
  (req as any).user = {
    id: session.userId,
    devicePubKey: session.devicePubKey,
  };

  next();
};

// Key derivation endpoint
app.post('/deriveKey', requireSession, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    console.log(`📡 Key derivation request for user: ${userId}`);

    // Generate a new AES key for this user session
    const aesKey = await generateAesKey();
    
    // Get user's device public key (in production this comes from device enrollment)
    const user = mockUsers.get(userId);
    if (!user || !user.deviceKeyPair) {
      return res.status(500).json({ error: 'User device key not found' });
    }

    // Wrap the AES key with the device's public key
    const wrappedKey = await wrapKey(aesKey, user.deviceKeyPair.publicKey);
    
    // Convert to base64 for transmission
    const wrappedKeyB64 = bufferToBase64(wrappedKey);

    console.log(`✅ Key wrapped and ready for transmission (${wrappedKey.byteLength} bytes)`);

    res.json({ 
      wrappedKey: wrappedKeyB64,
      keyId: `key-${Date.now()}`, // In production, this would be a proper key ID
    });

  } catch (error) {
    console.error('❌ Key derivation error:', error);
    res.status(500).json({ 
      error: 'Key derivation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'panda-vault-api'
  });
});

// Mock authentication endpoints for completeness
app.post('/auth/login', (req, res) => {
  const sessionId = `session-${Date.now()}`;
  mockSessions.set(sessionId, {
    userId: 'demo-user',
    devicePubKey: 'demo-device-key',
    authenticated: true,
  });

  res.json({ sessionId, message: 'Mock login successful' });
});

app.post('/auth/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    mockSessions.delete(sessionId);
  }
  res.json({ message: 'Mock logout successful' });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await initializeDemoUser();
    
    app.listen(PORT, () => {
      console.log(`🚀 Panda Vault API server running on port ${PORT}`);
      console.log(`📡 CORS enabled for: http://localhost:3000, http://localhost:3001`);
      console.log(`🔑 Key derivation endpoint: POST /deriveKey`);
      console.log(`💚 Health check: GET /health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();