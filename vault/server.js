import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local at the root directory
config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.VERCEL_ENV === 'production' 
  ? ['https://panda.chat', 'null'] // Allow null origins for sandboxed iframes
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Extract access token from Authorization header or cookies
function getAccessToken(req) {
  try {
    // First, try to get token from Authorization header (preferred for vault requests)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }

    // Fallback to Privy cookie for direct browser requests
    const privyToken = req.cookies['privy-token'];
    if (privyToken) {
      return privyToken;
    }

    console.log('[Vault-BFF] No access token found in header or cookies');
    return null;
  } catch (error) {
    console.error('[Vault-BFF] Failed to extract access token:', error);
    return null;
  }
}

// BFF API route for deriving keys
app.post('/api/vault/deriveKey', async (req, res) => {
  try {
    console.log('[Vault-BFF] Received deriveKey request');
    
    // Extract access token from Authorization header or cookies
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Call the actual session encryption key endpoint
    const appServerEndpoint = process.env.NEXT_PUBLIC_APP_SERVER_ENDPOINT;
    if (!appServerEndpoint) {
      return res.status(500).json({ error: 'App server endpoint not configured' });
    }

    const sessionKeyUrl = `${appServerEndpoint}/me/session_encryption_key`;

    try {
      const apiResponse = await fetch(sessionKeyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        console.error('[Vault-BFF] API request failed:', apiResponse.status, apiResponse.statusText);
        return res.status(apiResponse.status).json({ 
          error: `Failed to get session encryption key: ${apiResponse.statusText}` 
        });
      }

      const sessionKeyData = await apiResponse.json();

      // Parse the response format: { "old_key": "string", "new_key": "string" }
      if (!sessionKeyData.new_key) {
        console.error('[Vault-BFF] Invalid response format - missing new_key');
        return res.status(500).json({ error: 'Invalid session key response format' });
      }

      res.json(sessionKeyData);

    } catch (fetchError) {
      console.error('[Vault-BFF] Error calling session encryption key endpoint:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch session encryption key' 
      });
    }

  } catch (error) {
    console.error('[Vault-BFF] Error in deriveKey endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

app.post('/api/vault/createEncryptedId', async (req, res) => {
  try {
    // Extract access token from Authorization header or cookies
    const accessToken = getAccessToken(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Call the actual session encryption key endpoint
    const appServerEndpoint = process.env.NEXT_PUBLIC_APP_SERVER_ENDPOINT;
    if (!appServerEndpoint) {
      console.error('[Vault-BFF] NEXT_PUBLIC_APP_SERVER_ENDPOINT not configured');
      return res.status(500).json({ error: 'App server endpoint not configured' });
    }

    const sessionKeyUrl = `${appServerEndpoint}/me/encrypted-id`;

    try {
      const apiResponse = await fetch(sessionKeyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encrypted_id: req.body.encrypted_id }),
      });

      if (!apiResponse.ok) {
        console.log(await apiResponse.json());
        console.error('[Vault-BFF] API request failed:', apiResponse.status, apiResponse.statusText);
        return res.status(apiResponse.status).json({ 
          error: `Failed to get session encryption key: ${apiResponse.statusText}` 
        });
      }

      const sessionKeyData = await apiResponse.json();

      if (!sessionKeyData.encrypted_id) {
        console.error('[Vault-BFF] Invalid response format - missing encrypted_id');
        return res.status(500).json({ error: 'Invalid session key response format' });
      }

      res.json(sessionKeyData);

    } catch (fetchError) {
      console.error('[Vault-BFF] Error calling session encryption key endpoint:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch session encryption key' 
      });
    }

  } catch (error) {
    console.error('[Vault-BFF] Error in deriveKey endpoint:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist directory (after API routes)
app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, () => {
  console.log(`🔐 Vault server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🚀 BFF API available at: http://localhost:${PORT}/api/vault/deriveKey`);
}); 