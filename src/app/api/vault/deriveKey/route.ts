import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AppServer } from '@/sdk/client/app-server';
import type { DeriveKeyResponse } from '@/types/vault';

// CORS headers for vault iframe communication
function getCorsHeaders(origin: string | null): Record<string, string> {
  // Allow requests from the vault domain and localhost for development
  const allowedOrigins = [
    'http://localhost:3001',
    'null' // For local file access in iframe sandbox
  ];
  
  const requestOrigin = origin || 'null';
  
  // Allow any localhost port for development (to handle dynamic ports)
  const isLocalhost = requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:');
  const isProduction = requestOrigin === 'https://vault.panda.chat';
  const isAllowed = allowedOrigins.includes(requestOrigin) || isLocalhost || isProduction;
  
  const allowOrigin = isAllowed ? requestOrigin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Extract access token from Authorization header or Privy session cookies
async function getAccessToken(request: NextRequest, cookieStore: any): Promise<string | null> {
  try {
    // First, try to get token from Authorization header (preferred for vault requests)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('[BFF] Found access token in Authorization header');
      return authHeader.replace('Bearer ', '');
    }

    // Fallback to Privy cookie for direct browser requests
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
      console.log('[BFF] Found privy-token cookie');
      return privyToken;
    }

    console.log('[BFF] No access token found in header or cookies');
    return null;
  } catch (error) {
    console.error('[BFF] Failed to extract access token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[BFF] Received vault deriveKey request');
    
    // Get origin for CORS headers
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    // Get cookies from the request
    const cookieStore = await cookies();
    
    // Extract access token from Authorization header or Privy session cookies
    const accessToken = await getAccessToken(request, cookieStore);
    
    if (!accessToken) {
      console.log('[BFF] No valid access token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Create a function that returns the access token (matching the GetAccessTokenFn interface)
    const getAccessTokenFn = async () => {
      return accessToken;
    };

    // Create AppServer instance with the access token function
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_SERVER_ENDPOINT || '';
    const appServer = new AppServer(appBaseUrl, getAccessTokenFn);

    // For now, we'll generate a mock wrapped key
    // In a real implementation, this would:
    // 1. Get the user's device public key
    // 2. Generate or retrieve a master key for the user
    // 3. Wrap the master key with the device public key
    // 4. Return the wrapped key
    
    console.log('[BFF] Generating mock wrapped key for testing');
    
    // Mock wrapped key (base64 encoded)
    // In production, this should be a real AES key wrapped with RSA-OAEP
    const mockWrappedKey = Buffer.from('mock-wrapped-key-data-for-testing').toString('base64');
    
    const response: DeriveKeyResponse = {
      wrappedKey: mockWrappedKey
    };

    console.log('[BFF] Returning wrapped key to vault');
    return NextResponse.json(response, { headers: corsHeaders });

  } catch (error) {
    console.error('[BFF] Error in deriveKey endpoint:', error);
    // Get origin for CORS headers in error case
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  return NextResponse.json({}, { headers: corsHeaders });
}

// Only allow POST requests
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: corsHeaders }
  );
} 