// Utility functions for Vercel API routes

/**
 * Parse cookies from request headers
 * @param {string} cookieHeader - Cookie header string
 * @returns {Object} Parsed cookies object
 */
export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  
  return cookieHeader
    .split(';')
    .reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }, {});
}

/**
 * Extract access token from Authorization header or cookies
 * @param {Object} req - Request object
 * @returns {string|null} Access token or null if not found
 */
export function getAccessToken(req) {
  try {
    // First, try to get token from Authorization header (preferred for vault requests)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }

    // Fallback to Privy cookie for direct browser requests
    const cookies = parseCookies(req.headers.cookie);
    const privyToken = cookies['privy-token'];
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

/**
 * Set CORS headers for Vercel API routes
 * @param {Object} res - Response object
 * @param {Object} req - Request object
 * @param {string[]} methods - Allowed HTTP methods
 */
export function setCorsHeaders(res, req, methods = ['GET', 'POST', 'OPTIONS']) {
  const allowedOrigins = process.env.VERCEL_ENV === 'production' 
    ? ['https://panda.chat', 'null'] // Allow null origins for sandboxed iframes
    : true;
  
  const origin = req.headers.origin;
  
  // Handle CORS headers
  if (allowedOrigins === true) {
    // In development, allow any origin including null
    // Note: When credentials are true, we cannot use '*', so we must echo the origin
    res.setHeader('Access-Control-Allow-Origin', origin || 'null');
  } else if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
    // In production, only allow specific origins
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.VERCEL_ENV !== 'production') {
    // In development, allow null origins from sandboxed iframes
    res.setHeader('Access-Control-Allow-Origin', origin || 'null');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie');
} 