import { useState, useCallback, useRef } from 'react';
import { ChatMessage, EncryptedMessage } from '@/app/types/chat';
import { MultimodalContent } from '@/app/client/api';
import { EncryptionService } from '@/app/services/EncryptionService';

// Define the possible states for a decryption attempt
enum DecryptionStatus {
  PENDING = 'pending',
  DECRYPTING = 'decrypting',
  SUCCESS = 'success',
  ERROR = 'error',
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
  getDecryptedContent: (messageId: string) => string | MultimodalContent[] | null;
  /**
   * Checks if a specific message is currently being decrypted.
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
  const [decryptionCache, setDecryptionCache] = useState<Record<string, DecryptionState>>({});
  // Ref to track IDs currently being decrypted to prevent redundant async calls
  const decryptingIdsRef = useRef<Set<string>>(new Set());

  const decryptSingleMessage = useCallback(async (message: ChatMessage) => {
    const id = message.id;
    if (!id || decryptingIdsRef.current.has(id)) {
      // Already decrypting or invalid ID
      return;
    }

    // Mark as decrypting immediately
    decryptingIdsRef.current.add(id);
    setDecryptionCache(prev => ({
      ...prev,
      [id]: { status: DecryptionStatus.DECRYPTING, content: null },
    }));

    try {
      // Perform decryption
      const decryptedContent = await EncryptionService.decryptChatMessageContent(message.content);

      // Update cache on success
      setDecryptionCache(prev => ({
        ...prev,
        [id]: { status: DecryptionStatus.SUCCESS, content: decryptedContent },
      }));

    } catch (error) {
      console.error(`[useDecryptionManager] Failed to decrypt message ${id}:`, error);
      // Update cache on error
      setDecryptionCache(prev => ({
        ...prev,
        [id]: { status: DecryptionStatus.ERROR, content: null },
      }));

    } finally {
      // Remove from tracking ref regardless of outcome
      decryptingIdsRef.current.delete(id);
    }
  }, []); // No dependencies as it relies on message input and service

  const decryptMessages = useCallback((messages: ChatMessage[]) => {
    if (!messages || messages.length === 0) return;

    messages.forEach(message => {
      if (message?.id && !decryptionCache[message.id] && !decryptingIdsRef.current.has(message.id)) {
        // Decrypt only if ID exists, not in cache, and not already being decrypted
        decryptSingleMessage(message);
      }
    });
  }, [decryptionCache, decryptSingleMessage]);

  const getDecryptedContent = useCallback((messageId: string): string | MultimodalContent[] | null => {
    const state = decryptionCache[messageId];
    // Return content only if successfully decrypted
    return state?.status === DecryptionStatus.SUCCESS ? state.content : null;
  }, [decryptionCache]);

  const isLoading = useCallback((messageId: string): boolean => {
    const state = decryptionCache[messageId];
    // Loading if explicitly 'decrypting' or if not yet in cache (implicitly pending)
    return state?.status === DecryptionStatus.DECRYPTING || !state;
  }, [decryptionCache]);

  const clearCache = useCallback(() => {
    setDecryptionCache({});
    decryptingIdsRef.current.clear();
    console.log("[useDecryptionManager] Cache cleared.");
  }, []);

  return { decryptMessages, getDecryptedContent, isLoading, clearCache };
} 