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

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
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
      console.log('[Vault-BFF] Found access token in Authorization header');
      return authHeader.replace('Bearer ', '');
    }

    // Fallback to Privy cookie for direct browser requests
    const privyToken = req.cookies['privy-token'];
    if (privyToken) {
      console.log('[Vault-BFF] Found privy-token cookie');
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
      console.log('[Vault-BFF] No valid access token found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Call the actual session encryption key endpoint
    const appServerEndpoint = process.env.NEXT_PUBLIC_APP_SERVER_ENDPOINT;
    if (!appServerEndpoint) {
      console.error('[Vault-BFF] NEXT_PUBLIC_APP_SERVER_ENDPOINT not configured');
      return res.status(500).json({ error: 'App server endpoint not configured' });
    }

    const sessionKeyUrl = `${appServerEndpoint}/me/session_encryption_key`;
    console.log('[Vault-BFF] Calling session encryption key endpoint:', sessionKeyUrl);

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
      console.log('[Vault-BFF] Received session key data');

      // Parse the response format: { "old_key": "string", "new_key": "string" }
      if (!sessionKeyData.new_key) {
        console.error('[Vault-BFF] Invalid response format - missing new_key');
        return res.status(500).json({ error: 'Invalid session key response format' });
      }
      
      if (!sessionKeyData.old_key) {
        console.error('[Vault-BFF] Invalid response format - missing old_key');
        return res.status(500).json({ error: 'Invalid session key response format' });
      }


      console.log('[Vault-BFF] Returning session encryption key to vault');
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