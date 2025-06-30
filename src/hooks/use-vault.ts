// useVault hook - manages communication with sandboxed vault iframe

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  InitMsg,
  AckMsg,
  VaultRequest,
  VaultResponse,
  DeriveReq,
  DeriveRes,
  EncryptReq,
  EncryptRes,
  DecryptReq,
  DecryptRes,
  ErrorRes,
} from '@/types/vault';

interface VaultState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface UseVaultResult {
  state: VaultState;
  derive: () => Promise<void>;
  encrypt: (plain: string) => Promise<{ ciphertext: ArrayBuffer; iv: ArrayBuffer }>;
  decrypt: (cipher: ArrayBuffer, iv: ArrayBuffer) => Promise<string>;
  reset: () => void;
}

export function useVault(): UseVaultResult {
  const [state, setState] = useState<VaultState>({
    isReady: false,
    isLoading: false,
    error: null,
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const portRef = useRef<MessagePort | null>(null);
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());
  const requestIdCounterRef = useRef(0);

  // Create iframe and establish communication
  const initializeVault = useCallback(async (): Promise<void> => {
    if (state.isReady || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create hidden iframe with sandbox restrictions
      const iframe = document.createElement('iframe');
      // Use localhost for development, production domain for production
      iframe.src = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3001' 
        : 'https://vault.panda.chat';
      iframe.sandbox.add('allow-scripts'); // Only allow scripts, no same-origin access
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';

      // Add to DOM
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
          reject(new Error('Failed to load vault iframe'));
        };
      });

      // Establish MessageChannel communication
      const channel = new MessageChannel();
      const port1 = channel.port1;
      const port2 = channel.port2;

      portRef.current = port1;

      // Listen for messages from vault
      port1.onmessage = handleVaultMessage;

      // Send init message with port2 to vault
      const initMsg: InitMsg = { cmd: 'init' };
      iframe.contentWindow?.postMessage(initMsg, '*', [port2]);

      // Wait for ACK from vault
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Vault initialization timeout'));
        }, 5000);

        const handleAck = (event: MessageEvent) => {
          const data = event.data as AckMsg;
          if (data.ok) {
            clearTimeout(timeout);
            port1.removeEventListener('message', handleAck);
            resolve();
          }
        };

        port1.addEventListener('message', handleAck);
      });

      setState(prev => ({ ...prev, isReady: true, isLoading: false }));
      console.log('[useVault] Vault initialized successfully');

    } catch (error) {
      console.error('[useVault] Vault initialization failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      cleanup();
    }
  }, [state.isReady, state.isLoading]);

  const handleVaultMessage = useCallback((event: MessageEvent) => {
    const response = event.data as VaultResponse;
    
    const pendingRequest = pendingRequestsRef.current.get(response.id);
    if (!pendingRequest) {
      console.warn('[useVault] Received response for unknown request:', response.id);
      return;
    }

    pendingRequestsRef.current.delete(response.id);

    if ('error' in response) {
      pendingRequest.reject(new Error(response.error));
    } else {
      pendingRequest.resolve(response);
    }
  }, []);

  const sendRequest = useCallback(async <T extends VaultResponse>(
    request: Omit<VaultRequest, 'id'>
  ): Promise<T> => {
    if (!state.isReady || !portRef.current) {
      throw new Error('Vault not ready');
    }

    const id = `req_${++requestIdCounterRef.current}`;
    const fullRequest: VaultRequest = { ...request, id } as VaultRequest;

    return new Promise<T>((resolve, reject) => {
      // Store pending request
      pendingRequestsRef.current.set(id, {
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Set timeout for request
      setTimeout(() => {
        const pending = pendingRequestsRef.current.get(id);
        if (pending) {
          pendingRequestsRef.current.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout

      // Send request
      portRef.current!.postMessage(fullRequest);
    });
  }, [state.isReady]);

  const derive = useCallback(async (): Promise<void> => {
    const request: Omit<DeriveReq, 'id'> = { cmd: 'derive' };
    await sendRequest<DeriveRes>(request);
  }, [sendRequest]);

  const encrypt = useCallback(async (plain: string): Promise<{
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
  }> => {
    const request: Omit<EncryptReq, 'id'> = { cmd: 'encrypt', plain };
    const response = await sendRequest<EncryptRes>(request);
    return {
      ciphertext: response.ciphertext,
      iv: response.iv,
    };
  }, [sendRequest]);

  const decrypt = useCallback(async (
    cipher: ArrayBuffer,
    iv: ArrayBuffer
  ): Promise<string> => {
    const request: Omit<DecryptReq, 'id'> = { cmd: 'decrypt', cipher, iv };
    const response = await sendRequest<DecryptRes>(request);
    return response.plain;
  }, [sendRequest]);

  const cleanup = useCallback(() => {
    // Clear pending requests
    pendingRequestsRef.current.forEach(pending => {
      pending.reject(new Error('Vault reset'));
    });
    pendingRequestsRef.current.clear();

    // Close port
    if (portRef.current) {
      portRef.current.close();
      portRef.current = null;
    }

    // Remove iframe
    if (iframeRef.current && iframeRef.current.parentNode) {
      iframeRef.current.parentNode.removeChild(iframeRef.current);
      iframeRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState({
      isReady: false,
      isLoading: false,
      error: null,
    });
  }, [cleanup]);

  // Auto-initialize on mount
  useEffect(() => {
    initializeVault();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [initializeVault, cleanup]);

  // Cleanup pending requests that are too old
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute

      pendingRequestsRef.current.forEach((pending, id) => {
        if (now - pending.timestamp > timeout) {
          pending.reject(new Error('Request expired'));
          pendingRequestsRef.current.delete(id);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    state,
    derive,
    encrypt,
    decrypt,
    reset,
  };
}