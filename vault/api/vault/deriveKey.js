import { getAccessToken, setCorsHeaders } from '../_utils.js';

// Vercel serverless function for deriveKey endpoint
export default async function handler(req, res) {
  // Set CORS headers
  setCorsHeaders(res, req, ['POST', 'OPTIONS']);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
} 