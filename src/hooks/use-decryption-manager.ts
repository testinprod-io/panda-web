import { useState, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { MultimodalContent } from "@/client/api";
import { EncryptionService } from "@/services/encryption-service";

// Define the possible states for a decryption attempt
enum DecryptionStatus {
  PENDING = "pending",
  DECRYPTING = "decrypting",
  SUCCESS = "success",
  ERROR = "error",
}

// Define the structure to hold the state and potential content
interface DecryptionState {
  status: DecryptionStatus;
  content: string | MultimodalContent[] | null; // Store decrypted content on success, null otherwise
}

// Define the return type of the hook
interface DecryptionManager {
  /**
   * Initiates decryption for an array of encrypted messages.
   * Only attempts decryption for messages not already processed or currently decrypting.
   */
  decryptMessages: (messages: ChatMessage[]) => void;
  /**
   * Retrieves the decrypted content for a given message ID.
   * Returns null if decryption is pending, failed, or message not found.
   */
  getDecryptedContent: (
    messageId: string,
  ) => string | MultimodalContent[] | null;
  /**
   * Checks if a specific message is currently being decrypted or pending.
   */
  isLoading: (messageId: string) => boolean;
  /**
   * Clears the entire decryption cache.
   */
  clearCache: () => void;
}

/**
 * Custom hook to manage the decryption of chat messages.
 * It maintains a cache of decryption states and results.
 */
export function useDecryptionManager(): DecryptionManager {
  const [decryptionCache, setDecryptionCache] = useState<
    Record<string, DecryptionState>
  >({});

  const decryptSingleMessage = useCallback(
    async (message: ChatMessage) => {
      const id = message.id;
      if (!id) return;

      const currentCachedState = decryptionCache[id];
      const contentToDecrypt = message.content ?? ""; // Ensure content is not null for processing

      // Determine if we need to set to DECRYPTING
      const shouldSetToDecrypting =
        !currentCachedState ||
        currentCachedState.status === DecryptionStatus.ERROR ||
        ((contentToDecrypt === "" || message.content === null) && // Check placeholder state
          (!currentCachedState ||
            currentCachedState.status !== DecryptionStatus.SUCCESS));

      if (shouldSetToDecrypting) {
        const newDecryptingState: DecryptionState = {
          status: DecryptionStatus.DECRYPTING,
          content:
            currentCachedState?.status === DecryptionStatus.ERROR
              ? currentCachedState.content
              : null,
        };
        // Only update if state is different
        if (
          !currentCachedState ||
          currentCachedState.status !== newDecryptingState.status ||
          currentCachedState.content !== newDecryptingState.content
        ) {
          setDecryptionCache((prev) => ({ ...prev, [id]: newDecryptingState }));
        }
      }

      try {
        const decryptedStringContent = await EncryptionService.decrypt(
          contentToDecrypt as string,
        );
        let finalContent: string | MultimodalContent[];
        try {
          if (
            typeof decryptedStringContent === "string" &&
            (decryptedStringContent.startsWith("[") ||
              decryptedStringContent.startsWith("{"))
          ) {
            finalContent = JSON.parse(decryptedStringContent);
          } else {
            finalContent = decryptedStringContent;
          }
        } catch (e) {
          console.warn(
            `[useDecryptionManager] Content for message ${id} was not valid JSON, using as plain string.`,
            decryptedStringContent,
          );
          finalContent = decryptedStringContent;
        }

        // Only update if status or content actually changed
        if (
          !currentCachedState ||
          currentCachedState.status !== DecryptionStatus.SUCCESS ||
          currentCachedState.content !== finalContent
        ) {
          setDecryptionCache((prev) => ({
            ...prev,
            [id]: { status: DecryptionStatus.SUCCESS, content: finalContent },
          }));
        }
      } catch (error) {
        console.error(
          `[useDecryptionManager] Failed to decrypt message ${id}:`,
          error,
        );
        // Only update if status or content actually changed
        if (
          !currentCachedState ||
          currentCachedState.status !== DecryptionStatus.ERROR ||
          currentCachedState.content !== null
        ) {
          setDecryptionCache((prev) => ({
            ...prev,
            [id]: { status: DecryptionStatus.ERROR, content: null },
          }));
        }
      }
    },
    [decryptionCache],
  );

  const decryptMessages = useCallback(
    (messages: ChatMessage[]) => {
      if (!messages || messages.length === 0) return;
      messages.forEach((message) => {
        if (message?.id) {
          decryptSingleMessage(message);
        }
      });
    },
    [decryptSingleMessage],
  );

  const getDecryptedContent = useCallback(
    (messageId: string): string | MultimodalContent[] | null => {
      const state = decryptionCache[messageId];
      return state?.status === DecryptionStatus.SUCCESS ? state.content : null;
    },
    [decryptionCache],
  );

  const isLoading = useCallback(
    (messageId: string): boolean => {
      const state = decryptionCache[messageId];
      return state?.status === DecryptionStatus.DECRYPTING || !state;
    },
    [decryptionCache],
  );

  const clearCache = useCallback(() => {
    setDecryptionCache({});
    console.log("[useDecryptionManager] Cache cleared.");
  }, []);

  return { decryptMessages, getDecryptedContent, isLoading, clearCache };
}
