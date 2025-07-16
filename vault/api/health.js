import { setCorsHeaders } from './_utils.js';

// Vercel serverless function for health check
export default async function handler(req, res) {
  // Set CORS headers
  setCorsHeaders(res, req, ['GET', 'OPTIONS']);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'panda-vault'
  });
} 