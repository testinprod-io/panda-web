// Vault integration hook - manages sandboxed iframe communication
import { useEffect, useRef, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  type VaultMessage,
  type VaultRequest,
  type VaultResponse,
  type InitMsg,
  type DeriveReq,
  type EncryptReq,
  type DecryptReq,
  isAckMsg,
  isErrorRes,
} from './protocol';

const VAULT_URL = 'http://localhost:3001'; // Development URL
const API_URL = 'http://localhost:3002'; // API server URL

interface VaultState {
  isReady: boolean;
  isInitializing: boolean;
  error: string | null;
}

interface UseVaultReturn {
  state: VaultState;
  derive: () => Promise<void>;
  encrypt: (plain: string) => Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }>;
  decrypt: (cipher: ArrayBuffer, iv: ArrayBuffer) => Promise<string>;
}

export function useVault(): UseVaultReturn {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const portRef = useRef<MessagePort | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map());
  
  const [state, setState] = useState<VaultState>({
    isReady: false,
    isInitializing: false,
    error: null,
  });

  // Create and setup iframe
  const setupVault = useCallback(async () => {
    if (state.isInitializing || state.isReady) return;
    
    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Create sandboxed iframe
      const iframe = document.createElement('iframe');
      iframe.src = VAULT_URL;
      iframe.sandbox.add('allow-scripts'); // Only allow scripts, no same-origin
      iframe.style.display = 'none'; // Hidden off-screen
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // Wait for iframe to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Vault iframe load timeout'));
        }, 10000);

        iframe.onload = () => {
          clearTimeout(timeout);
          resolve();
        };

        iframe.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Vault iframe load error'));
        };
      });

      // Create message channel
      const channel = new MessageChannel();
      const port = channel.port1;
      portRef.current = port;

      // Setup message handling
      port.addEventListener('message', (event) => {
        const response: VaultResponse = event.data;
        
        if (isAckMsg(response)) {
          // Initial acknowledgment
          setState(prev => ({ ...prev, isReady: true, isInitializing: false }));
          return;
        }

        // Handle response to pending request
        if (response && typeof response === 'object' && 'id' in response) {
          const pending = pendingRequests.current.get(response.id);
          if (pending) {
            pendingRequests.current.delete(response.id);
            
            if (isErrorRes(response)) {
              pending.reject(new Error(response.error));
            } else {
              pending.resolve(response);
            }
          }
        }
      });

      port.start();

      // Send initialization message
      const initMsg: InitMsg = { cmd: 'init' };
      iframe.contentWindow?.postMessage(initMsg, VAULT_URL, [channel.port2]);

      // Wait for acknowledgment
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Vault initialization timeout'));
        }, 5000);

        const originalHandler = port.onmessage;
        port.onmessage = (event) => {
          if (isAckMsg(event.data)) {
            clearTimeout(timeout);
            port.onmessage = originalHandler;
            resolve();
          }
        };
      });

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isInitializing: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      
      // Cleanup on error
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
        iframeRef.current = null;
      }
      portRef.current = null;
    }
  }, [state.isInitializing, state.isReady]);

  // Generic request handler
  const sendRequest = useCallback(async <T extends VaultResponse>(request: VaultRequest): Promise<T> => {
    if (!state.isReady || !portRef.current) {
      throw new Error('Vault not ready');
    }

    return new Promise<T>((resolve, reject) => {
      const id = uuidv4();
      const requestWithId = { ...request, id };
      
      // Store pending request
      pendingRequests.current.set(id, { resolve, reject });
      
      // Set timeout
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(id);
        reject(new Error('Request timeout'));
      }, 30000);

      // Override resolve/reject to clear timeout
      const originalResolve = resolve;
      const originalReject = reject;
      
      pendingRequests.current.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        },
      });

      // Send request
      portRef.current!.postMessage(requestWithId);
    });
  }, [state.isReady]);

  // API methods
  const derive = useCallback(async (): Promise<void> => {
    const request: DeriveReq = { cmd: 'derive', id: '' }; // ID will be set by sendRequest
    await sendRequest(request);
  }, [sendRequest]);

  const encrypt = useCallback(async (plain: string): Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }> => {
    const request: EncryptReq = { cmd: 'encrypt', plain, id: '' };
    const response = await sendRequest(request);
    return {
      ciphertext: (response as any).ciphertext,
      iv: (response as any).iv,
    };
  }, [sendRequest]);

  const decrypt = useCallback(async (cipher: ArrayBuffer, iv: ArrayBuffer): Promise<string> => {
    const request: DecryptReq = { cmd: 'decrypt', cipher, iv, id: '' };
    const response = await sendRequest(request);
    return (response as any).plain;
  }, [sendRequest]);

  // Auto-initialize on mount
  useEffect(() => {
    setupVault();

    // Cleanup on unmount
    return () => {
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
      }
      portRef.current?.close();
    };
  }, [setupVault]);

  return {
    state,
    derive,
    encrypt,
    decrypt,
  };
}