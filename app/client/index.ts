import { usePrivy } from '@privy-io/react-auth';
import { ApiClient } from './client';

// TODO: Replace with your actual backend API base URL
const API_BASE_URL = "http://3.15.240.252:8000"// process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; 

// TODO: Integrate with Privy to get the access token.
// This is a placeholder. You might need to use a React hook context 
// or another state management solution to access the token 
// outside of a component context if needed, or pass the 
// getAccessToken function from where usePrivy is available.
const getAuthToken = async (): Promise<string | null> => {
  // Example using Privy (if available in this context):
  const { getAccessToken } = usePrivy(); 
  return getAccessToken();

  console.warn('getAuthToken placeholder used. Integrate with Privy.');
  // Replace with your actual token retrieval logic
  // For development, you might return a test token or null
  // return "YOUR_TEST_TOKEN"; 
  return null; 
};


export const apiClient = new ApiClient(API_BASE_URL, getAuthToken);

// Re-export client and types for convenience
export * from './client';
export * from './types'; 