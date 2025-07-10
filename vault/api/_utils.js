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
      console.log('[Vault-BFF] Found access token in Authorization header');
      return authHeader.replace('Bearer ', '');
    }

    // Fallback to Privy cookie for direct browser requests
    const cookies = parseCookies(req.headers.cookie);
    const privyToken = cookies['privy-token'];
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

/**
 * Set CORS headers for Vercel API routes
 * @param {Object} res - Response object
 * @param {Object} req - Request object
 * @param {string[]} methods - Allowed HTTP methods
 */
export function setCorsHeaders(res, req, methods = ['GET', 'POST', 'OPTIONS']) {
  const allowedOrigins = process.env.VERCEL_ENV === 'production' 
    ? ['https://panda.chat']
    : true;
  
  const origin = req.headers.origin;
  if (allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie');
} 