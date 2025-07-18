import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
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
  SetPasswordReq,
  SetPasswordRes,
  CreateUserPasswordReq,
  CreateUserPasswordRes,
  UpdateKeyEvent,
  UpdateKeyRes,
  BootstrapReq,
  BootstrapRes,
  ClearKeysReq,
  ClearKeysRes,
  EncryptFileReq,
  EncryptFileRes,
  DecryptFileReq,
  DecryptFileRes,
  ErrorRes,
} from "@/types/vault";

interface VaultState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  needsPassword: boolean; 
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface UseVaultResult {
  state: VaultState;
  bootstrap: (
    encryptedId: string,
    userId: string,
    encryptedPassword?: string,
    password?: string
  ) => Promise<BootstrapRes>;
  setPassword: (
    password: string,
    encryptedId: string,
    userId: string
  ) => Promise<string>; // Returns encrypted password with validation
  createUserPassword: (
    password: string,
    userId: string
  ) => Promise<CreateUserPasswordRes>; // Creates password and encrypted ID
  updateKey: (encryptedPassword: string) => Promise<string>; // Returns new encrypted password
  derive: () => Promise<void>;
  encrypt: (plain: string) => Promise<string>;
  decrypt: (encrypted: string) => Promise<string>;
  encryptFile: (
    fileData: ArrayBuffer,
    fileName: string,
    fileType: string
  ) => Promise<ArrayBuffer>;
  decryptFile: (
    encryptedData: ArrayBuffer,
    fileName: string,
    fileType: string
  ) => Promise<ArrayBuffer>;
  clearKeys: () => Promise<void>; // Clears sensitive data from memory
  reset: () => void;
  onPasswordUpdated?: (encryptedPassword: string) => void; // Callback for key rotation
}

export function useVault(): UseVaultResult {
  const { getAccessToken } = usePrivy();
  const [state, setState] = useState<VaultState>({
    isReady: false,
    isLoading: false,
    error: null,
    needsPassword: false,
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const portRef = useRef<MessagePort | null>(null);
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());
  const requestIdCounterRef = useRef(0);
  const initStartedRef = useRef(false);
  const onPasswordUpdatedRef = useRef<
    ((encryptedPassword: string) => void) | undefined
  >(undefined);

  const cleanup = useCallback(() => {
    pendingRequestsRef.current.forEach((pending) => {
      pending.reject(new Error("Vault reset"));
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

    // Allow re-initialization
    initStartedRef.current = false;
  }, []);

  const handleVaultMessage = useCallback((event: MessageEvent) => {
    // Handle special messages from vault
    if (event.data.cmd === "passwordUpdated") {
      if (onPasswordUpdatedRef.current) {
        onPasswordUpdatedRef.current(event.data.encryptedPassword);
      }
      return;
    }

    const response = event.data as VaultResponse;

    const pendingRequest = pendingRequestsRef.current.get(response.id);
    if (!pendingRequest) {
      return;
    }

    pendingRequestsRef.current.delete(response.id);

    if ("error" in response) {
      pendingRequest.reject(new Error(response.error));
    } else {
      pendingRequest.resolve(response);
    }
  }, []);

  // Create iframe and establish communication
  const initializeVault = useCallback(
    async (
      encryptedId?: string,
      userId?: string,
      encryptedPassword?: string
    ): Promise<void> => {
      if (initStartedRef.current) {
        return;
      }
      initStartedRef.current = true;

      const vaultOrigin = process.env.NEXT_PUBLIC_VAULT_ENDPOINT
        ? process.env.NEXT_PUBLIC_VAULT_ENDPOINT
        : "http://localhost:3001";

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create hidden iframe with sandbox restrictions
        const iframe = document.createElement("iframe");
        // Use localhost for development, production domain for production
        iframe.src = vaultOrigin;
        // Add necessary sandbox permissions for network requests
        iframe.sandbox.add("allow-scripts");
        iframe.sandbox.add("allow-forms"); // Needed for fetch requests
        iframe.style.display = "none";
        iframe.style.position = "absolute";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        iframe.style.width = "1px";
        iframe.style.height = "1px";

        // Add to DOM
        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        // Wait for iframe to load
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.error("[useVault] iframe.onload did not fire in time.");
            reject(new Error("Vault iframe load timeout"));
          }, 10000);

          iframe.onload = () => {
            clearTimeout(timeout);
            resolve();
          };

          iframe.onerror = (e) => {
            console.error("[useVault] iframe.onerror event fired:", e);
            clearTimeout(timeout);
            reject(new Error("Failed to load vault iframe"));
          };
        });

        const channel = new MessageChannel();
        const port1 = channel.port1;
        const port2 = channel.port2;

        portRef.current = port1;

        // Send init message with port2 to vault
        // Include the access token for API requests
        const accessToken = await getAccessToken(); // Get Privy access token

        if (!accessToken) {
          throw new Error(
            "No access token available - user must be authenticated"
          );
        }

        const initMsg: InitMsg = {
          cmd: "init",
          encryptedId,
          userId,
          encryptedPassword,
          accessToken,
        };
        iframe.contentWindow?.postMessage(initMsg, "*", [port2]);

        // Wait for ACK from vault
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.error("[useVault] Timed out waiting for ACK.");
            reject(new Error("Vault initialization timeout"));
          }, 5000);

          // Temporarily set onmessage to listen for the ACK
          port1.onmessage = (event: MessageEvent) => {
            const data = event.data as AckMsg;
            if (data.ok) {
              clearTimeout(timeout);
              resolve();
            } else {
              reject(new Error("Invalid ACK from vault"));
            }
          };
        });

        // Now that we've received the ACK, set up the general message handler
        port1.onmessage = handleVaultMessage;

        setState((prev) => ({ ...prev, isReady: true, isLoading: false }));
      } catch (error) {
        console.log("[useVault] Vault initialization failed:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
        cleanup();
      }
    },
    [handleVaultMessage, cleanup]
  );

  const sendRequest = useCallback(
    async <T extends VaultResponse>(
      request: Omit<VaultRequest, "id">
    ): Promise<T> => {
      if (!state.isReady || !portRef.current) {
        await initializeVault();
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
            reject(new Error("Request timeout"));
          }
        }, 30000); // 30 second timeout

        // Send request
        portRef.current!.postMessage(fullRequest);
      });
    },
    [state.isReady]
  );

  const bootstrap = useCallback(
    async (
      encryptedId: string,
      userId: string,
      encryptedPassword?: string,
      password?: string
    ): Promise<BootstrapRes> => {
      const request: Omit<BootstrapReq, "id"> = {
        cmd: "bootstrap",
        encryptedId,
        userId,
        encryptedPassword,
        password,
      };
      const response = await sendRequest<BootstrapRes>(request);
      return response;
    },
    [sendRequest]
  );

  const setPassword = useCallback(
    async (
      password: string,
      encryptedId: string,
      userId: string
    ): Promise<string> => {
      const request: Omit<SetPasswordReq, "id"> = {
        cmd: "setPassword",
        password,
        encryptedId,
        userId,
      };
      const response = await sendRequest<SetPasswordRes>(request);
      return response.encryptedPassword;
    },
    [sendRequest]
  );

  const createUserPassword = useCallback(
    async (
      password: string,
      userId: string
    ): Promise<CreateUserPasswordRes> => {
      const request: Omit<CreateUserPasswordReq, "id"> = {
        cmd: "createUserPassword",
        password,
        userId,
      };
      const response = await sendRequest<CreateUserPasswordRes>(request);
      return response;
    },
    [sendRequest]
  );

  const updateKey = useCallback(
    async (encryptedPassword: string): Promise<string> => {
      const request: Omit<UpdateKeyEvent, "id"> = {
        cmd: "updateKey",
        encryptedPassword,
      };
      const response = await sendRequest<UpdateKeyRes>(request);
      return response.newEncryptedPassword;
    },
    [sendRequest]
  );

  const derive = useCallback(async (): Promise<void> => {
    const request: Omit<DeriveReq, "id"> = { cmd: "derive" };
    await sendRequest<DeriveRes>(request);
  }, [sendRequest]);

  const encrypt = useCallback(
    async (plain: string): Promise<string> => {
      const request: Omit<EncryptReq, "id"> = { cmd: "encrypt", plain };
      const response = await sendRequest<EncryptRes>(request);
      return response.encrypted;
    },
    [sendRequest]
  );

  const decrypt = useCallback(
    async (encrypted: string): Promise<string> => {
      const request: Omit<DecryptReq, "id"> = { cmd: "decrypt", encrypted };
      const response = await sendRequest<DecryptRes>(request);
      return response.plain;
    },
    [sendRequest]
  );

  const encryptFile = useCallback(
    async (
      fileData: ArrayBuffer,
      fileName: string,
      fileType: string
    ): Promise<ArrayBuffer> => {
      const request: Omit<EncryptFileReq, "id"> = {
        cmd: "encryptFile",
        fileData,
        fileName,
        fileType,
      };
      const response = await sendRequest<EncryptFileRes>(request);
      return response.encryptedData;
    },
    [sendRequest]
  );

  const decryptFile = useCallback(
    async (
      encryptedData: ArrayBuffer,
      fileName: string,
      fileType: string
    ): Promise<ArrayBuffer> => {
      const request: Omit<DecryptFileReq, "id"> = {
        cmd: "decryptFile",
        encryptedData,
        fileName,
        fileType,
      };
      const response = await sendRequest<DecryptFileRes>(request);
      return response.decryptedData;
    },
    [sendRequest]
  );

  const clearKeys = useCallback(async (): Promise<void> => {
    const request: Omit<ClearKeysReq, "id"> = { cmd: "clearKeys" };
    await sendRequest<ClearKeysRes>(request);
  }, [sendRequest]);

  const reset = useCallback(() => {
    cleanup();
    setState({
      isReady: false,
      isLoading: false,
      error: null,
      needsPassword: false,
    });
  }, [cleanup]);

  // Function for initializing without parameters
  const initVault = useCallback(() => initializeVault(), [initializeVault]);

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
          pending.reject(new Error("Request expired"));
          pendingRequestsRef.current.delete(id);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    state,
    bootstrap,
    setPassword,
    createUserPassword,
    updateKey,
    derive,
    encrypt,
    decrypt,
    encryptFile,
    decryptFile,
    clearKeys,
    reset,
    onPasswordUpdated: onPasswordUpdatedRef.current,
  };
}
