import {
  getMessageTextContent,
  safeLocalStorage,
} from "@/utils/utils";

import { indexedDBStorage } from "@/utils/indexedDB-storage";
import { UUID } from "crypto";
import {
  ServiceProvider,
  StoreKey,
  DEFAULT_PANDA_MODEL_NAME,
} from "../types/constant";
import Locale from "@/locales";
import { createPersistStore, MakeUpdater } from "@/utils/store";
import { ModelType } from "./config";
import { ModelConfig } from "@/types/constant";
import { ChatSession,  SessionSyncState, MessagesLoadState } from "@/types/session";
import { ChatMessage, createMessage, MessageSyncState } from "@/types/chat";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useApiClient } from "@/providers/api-client-provider";
import { Conversation, Message as ApiMessage, SenderTypeEnum } from "@/client/types"; // Added SenderTypeEnum
import { useChatActions } from "@/hooks/use-chat-actions"; // Import the actions hook
import { createJSONStorage } from "zustand/middleware"; // Added StateStorage
import { mapConversationToSession } from "@/services/ChatApiService";

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic; // Use locale
export const BOT_HELLO: ChatMessage = createMessage({
  role: "system",
  content: Locale.Store.BotHello,
  syncState: MessageSyncState.SYNCED, // Bot hello is always synced
});

// Initial state for the new interaction slice
const DEFAULT_CHAT_INTERACTION_STATE = {
  onSendMessageHandler: null as (((input: string, files: {url: string, fileId: string, type: string, name: string}[]) => Promise<void>) | null),
  hitBottom: true,
  scrollToBottomHandler: null as ((() => void) | null),
  showPromptModalHandler: null as ((() => void) | null),
  showShortcutKeyModalHandler: null as ((() => void) | null),
  isChatComponentBusy: false,
};

const DEFAULT_CHAT_STATE = {
  sessions: [] as ChatSession[], // Initialize as empty, will be loaded/merged
  currentSessionIndex: -1, // Start with no session selected
  lastInput: "",
  ...DEFAULT_CHAT_INTERACTION_STATE, // Merge interaction state here
};

// Define the core chat state type
type ChatState = typeof DEFAULT_CHAT_STATE;

// Define the fully hydrated state type including MakeUpdater
type HydratedChatState = ChatState & MakeUpdater<ChatState>;

export const useChatStore = createPersistStore(
  DEFAULT_CHAT_STATE,
  (set, _get) => {
    function get() {
      return {
        ..._get(),
        ...methods,
      };
    }

    function mergeSessions(localSessions: ChatSession[], serverConvos: Conversation[]): { mergedSessions: ChatSession[], newCurrentIndex: number } {
        const serverConvoMap = new Map(serverConvos.map(c => [c.conversation_id, c]));
        
        const mergedSessions: ChatSession[] = [];
        const usedServerIds = new Set<UUID>();
        const currentSession = get().currentSession(); // Get current session before merge

        localSessions.forEach(localSession => {
            const serverId = localSession.id;
            if (serverId && serverConvoMap.has(serverId)) {
                const serverConvo = serverConvoMap.get(serverId)!;
                // Merge: Prioritize server title, keep local messages (until loaded), take max update time
                mergedSessions.push({
                    ...localSession,
                    topic: serverConvo.title || localSession.topic || DEFAULT_TOPIC,
                    lastUpdate: Math.max(localSession.lastUpdate, new Date(serverConvo.updated_at).getTime()),
                    syncState: SessionSyncState.SYNCED, // Mark as synced if server version exists
                    messagesLoadState: localSession.messagesLoadState === MessagesLoadState.FULL ? MessagesLoadState.FULL : MessagesLoadState.NONE, // Reset load state unless fully loaded
                });
                usedServerIds.add(serverId);
            } else if (!serverId && localSession.syncState === SessionSyncState.PENDING_CREATE) {
                // Keep local-only sessions pending creation
                mergedSessions.push(localSession);
            } else if (!serverId) {
                 // Keep purely local sessions (maybe user created offline and never synced)
                 console.log(`[Merge] Keeping local-only session ${localSession.id}`);
                 mergedSessions.push({ ...localSession, syncState: SessionSyncState.LOCAL });
            } else {
                 // Local session points to a server ID that doesn't exist anymore (deleted elsewhere?)
                 console.warn(`[Merge] Local session ${localSession.id} points to deleted server ConvID ${serverId}. Keeping as local.`);
                 // TODO: Implement this
                //  mergedSessions.push({ ...localSession, conversationId: undefined, syncState: 'local', topic: localSession.topic || DEFAULT_TOPIC });
            }
        });

        // Add server conversations that weren't in local state
        serverConvoMap.forEach((serverConvo, serverId) => {
            if (!usedServerIds.has(serverId)) {
                // Convert server convo to local session format
                const newLocalSession = mapConversationToSession(serverConvo);
                newLocalSession.syncState = SessionSyncState.SYNCED;
                newLocalSession.messagesLoadState = MessagesLoadState.NONE; // Needs loading
                mergedSessions.push(newLocalSession);
                console.log(`[Merge] Added new session from server: ${serverId}`);
            }
        });

         // Ensure there's always at least one session (create a new local one if needed)
         if (mergedSessions.length === 0) {
             console.log("[Merge] No sessions after merge, creating a default local session.");
            //  mergedSessions.push(createEmptySession()); // Creates a 'local' session
         }

        // Sort sessions by last update time (most recent first)
        mergedSessions.sort((a, b) => b.lastUpdate - a.lastUpdate);

        // Determine the new currentSessionIndex
        let newCurrentIndex = 0; // Default to the first (most recent)
        if (currentSession) {
           // Try to find the previously selected session in the merged list
           const idx = mergedSessions.findIndex(s =>
               (s.id && s.id === currentSession.id)
           );
           if (idx !== -1) {
               newCurrentIndex = idx; // Keep the same session selected if found
           } else {
               console.log("[Merge] Previously selected session not found after merge, selecting most recent.");
           }
        } else if (mergedSessions.length > 0) {
            console.log("[Merge] No previous session selected, selecting most recent.");
        } else {
            console.log("[Merge] No sessions to select.");
            newCurrentIndex = -1; // Should not happen due to creation above, but safety check
        }

        console.log(`[Merge] Merged ${localSessions.length} local and ${serverConvos.length} server sessions into ${mergedSessions.length}. New index: ${newCurrentIndex}`);
        return { mergedSessions, newCurrentIndex };
    }

    // Merging logic stays within the store
    function mergeMessages(localMessages: ChatMessage[], serverMessages: ChatMessage[], currentLoadState: MessagesLoadState): { mergedMessages: ChatMessage[], newLoadState: MessagesLoadState, newCursor?: string } {
        const messageMap = new Map<string, ChatMessage>();

        // Start with server messages, marking them as synced
        serverMessages.forEach(msg => {
            messageMap.set(msg.id, { ...msg, syncState: MessageSyncState.SYNCED, isError: false, streaming: false }); // Assume server messages are final
        });

        // Add or update with local messages
        localMessages.forEach(localMsg => {
            const existing = messageMap.get(localMsg.id);
            if (!existing) {
                // Local message not on server (e.g., pending send, user input, bot response in progress)
                if (localMsg.syncState !== 'synced') { // Don't add local 'synced' messages if not on server (avoids duplicates if server data changed)
                    messageMap.set(localMsg.id, localMsg);
                } else {
                     console.warn(`[Merge Messages] Local message ${localMsg.id} marked synced but not found in server batch. Ignoring.`);
                }
            } else {
                 // Message exists on both. Prioritize local state for pending/error/streaming.
                 if (localMsg.syncState === 'pending_create' || localMsg.syncState === 'error' || localMsg.streaming) {
                      messageMap.set(localMsg.id, { ...existing, ...localMsg }); // Keep server ID but overlay local state
                 } else {
                      // Local state is synced or local, but server version exists. Use server version (already in map).
                 }
            }
        });

        const merged = Array.from(messageMap.values());
        // Ensure BOT_HELLO is present if it's the only message potentially
        if (merged.length === 1 && merged[0].id === BOT_HELLO.id && merged[0].content !== BOT_HELLO.content) {
             // If the only message is a modified BOT_HELLO (e.g., error state), replace with original BOT_HELLO
             merged[0] = BOT_HELLO;
        } else if (merged.length > 1 && merged[0].id === BOT_HELLO.id) {
            // Remove BOT_HELLO if real messages exist
            merged.shift();
        } else if (merged.length === 0) {
            // Add BOT_HELLO if no messages exist at all
            merged.push(BOT_HELLO);
        }

        // Sort by date, handling potential parsing issues
        merged.sort((a, b) => {
            try {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            } catch (e) { return 0; } // Fallback if date parsing fails
        });

        // Determine new load state - if serverMessages came from a paginated response,
        // the caller (action layer) will provide the 'has_more' and 'next_cursor' info.
        // This merge function itself doesn't know if it was a full load or partial.
        // The action layer will call updateTargetSession to set the final loadState and cursor.
        // We just return the merged messages.

        console.log(`[Merge Messages] Merged ${localMessages.length} local and ${serverMessages.length} server messages into ${merged.length}`);
        return { mergedMessages: merged, newLoadState: currentLoadState }; // Return currentLoadState, action updates it
    }

    const methods = {
      setCurrentSessionIndex(index: number) {
          const sessions = _get().sessions;
          if (index >= 0 && index < sessions.length) {
            set({ currentSessionIndex: index });
          } else {
            set({ currentSessionIndex: -1 }); // No sessions, no selection
          }
      },

      setSessions(sessions: ChatSession[], currentSessionIndex?: number) {
          const newIndex = currentSessionIndex ?? (sessions.length > 0 ? 0 : -1);
          set({
              sessions: sessions, // Assumes sessions are already decrypted
              currentSessionIndex: newIndex
          });
      },

      addSession(session: ChatSession) {
         // TODO: Should we order by latest session
         set(state => ({
             sessions: [session, ...state.sessions],
             currentSessionIndex: 0, // Select the new session
         }));
      },

      removeSession(index: number) {
          const sessions = _get().sessions.slice();
          if (index < 0 || index >= sessions.length) return; // Invalid index

          sessions.splice(index, 1);

          const currentIdx = _get().currentSessionIndex;
          let nextIndex = currentIdx;

          if (index === currentIdx) {
              // If deleting the current session, select the previous one or 0
              nextIndex = Math.max(0, index - 1);
          } else if (index < currentIdx) {
              // If deleting a session before the current one, adjust index
              nextIndex = currentIdx - 1;
          }
          // If deleting after current, index remains the same

          set({ sessions: sessions, currentSessionIndex: nextIndex });
      },

      // Updates a session identified by its local id or conversationId
      updateTargetSession(
          identifier: { id?: UUID },
          updater: (session: ChatSession) => void // Can modify session draft (in decrypted form)
      ) {
          set(state => {
             let index = -1;
             if (identifier.id) {
                 index = state.sessions.findIndex(s => s.id === identifier.id);
             }

             if (index === -1) {
                 console.warn(`[updateTargetSession] Session not found for identifier:`, identifier);
                 return state; // Return current state if no session found
             }

             const newSessions = [...state.sessions];
             const sessionToUpdate = { ...newSessions[index] }; // Shallow copy to modify (decrypted form)

             // Apply the updates immutably to the decrypted draft
             updater(sessionToUpdate);

             // Create a new object reference for the updated session
             newSessions[index] = sessionToUpdate;

             // Return the new state (with updated decrypted session)
             // Encryption happens when this state is persisted by the storage wrapper
             return { ...state, sessions: newSessions };
          });
      },

      // Add a user message to the current session (synchronous part)
      // addUserMessage(content: string) {
      //     const currentSession = get().currentSession();
      //     if (!currentSession) return null;

      //     const userMessage = createMessage({
      //         role: "user",
      //         content: content, // TODO: Store encrypted content in memory
      //         syncState: MessageSyncState.PENDING_CREATE,
      //     });

      //     get().updateTargetSession(currentSession, (session) => {
      //         session.messages = [...session.messages, userMessage] as ChatMessage[];
      //         session.lastUpdate = Date.now(); // Update timestamp
      //     });
      //     // Encryption of content happens when saving state via wrapper OR sending via ApiService
      //     return userMessage; // Return the created message (decrypted form)
      // },

      // Add a placeholder for bot response (synchronous part)
      // addBotMessagePlaceholder(model: ModelType | string) {
      //     const currentSession = get().currentSession();
      //     if (!currentSession) return null;

      //     const botMessage = createMessage({
      //         role: "system",
      //         content: "", // Start empty (decrypted)
      //         streaming: true,
      //         model: model as ModelType, // Store the model used
      //         syncState: MessageSyncState.PENDING_CREATE, // Also needs saving eventually
      //     });

      //     get().updateTargetSession(currentSession, (session) => {
      //         session.messages = [...session.messages, botMessage] as ChatMessage[];
      //         // Don't update lastUpdate here, wait for bot response finish
      //     });
      //     // Encryption happens when saving state via wrapper OR receiving final message via ApiService
      //     return botMessage; // Return the placeholder (decrypted form)
      // },

      // Update a specific message (e.g., for streaming updates, setting sync state)
      // updateMessage(
      //     sessionId: UUID,
      //     messageId: string,
      //     updater: (message: ChatMessage) => void // Operates on decrypted message draft
      // ) {
      //   //   const sessionIdentifier = sessionId ? { id: sessionId } : get().currentSession();
      //   //   if (!sessionIdentifier) return;

      //     get().updateTargetSession({ id: sessionId }, (session) => {
      //         const msgIndex = session.messages.findIndex(m => m.id === messageId);
      //         if (msgIndex !== -1) {
      //             const messageToUpdate = { ...session.messages[msgIndex] }; // Shallow copy (decrypted)
      //             updater(messageToUpdate); // Apply updates to decrypted draft
      //             session.messages = [
      //                 ...session.messages.slice(0, msgIndex),
      //                 messageToUpdate,
      //                 ...session.messages.slice(msgIndex + 1),
      //             ] as ChatMessage[];
      //             // Optionally update session lastUpdate time if message content is finalized
      //             if (!messageToUpdate.streaming && messageToUpdate.syncState !== 'pending_create') {
      //                 session.lastUpdate = Date.now();
      //             }
      //         } else {
      //              console.warn(`[updateMessage] Message ${messageId} not found in session ${sessionId}`);
      //         }
      //     });
      //     // Encryption happens when saving state via wrapper
      // },

      // Moves a session from one index to another
      moveSession(from: number, to: number) {
        set(state => {
          const { sessions, currentSessionIndex: oldIndex } = state;
          // Basic validation
          if (from < 0 || from >= sessions.length || to < 0 || to >= sessions.length) {
              return state;
          }

          const newSessions = [...sessions];
          const [movedSession] = newSessions.splice(from, 1); // Remove item
          newSessions.splice(to, 0, movedSession); // Insert item

          // Adjust currentSessionIndex after move
          let newIndex = oldIndex;
          if (oldIndex === from) {
            newIndex = to; // Follow the moved item
          } else if (from < oldIndex && to >= oldIndex) {
            newIndex--; // Item moved from before to after current
          } else if (from > oldIndex && to <= oldIndex) {
            newIndex++; // Item moved from after to before current
          }

          return {
            sessions: newSessions,
            currentSessionIndex: newIndex,
          };
        });
      },

      clearSessions() {
          console.log("[ChatStore] Clearing sessions, adding one default local session.");
          // const newSession = createEmptySession(); // Creates a 'local' session
          set({
            sessions: [],
            currentSessionIndex: -1,
            lastInput: "", // Also clear last input
          });
      },

      // Renamed from selectSession to avoid implying async ops
      _selectSessionIndex(index: number) {
        set({ currentSessionIndex: index });
        // Loading messages is now an action, triggered elsewhere
      },

      currentSession() {
        const { sessions, currentSessionIndex } = _get();
        if (currentSessionIndex < 0 || currentSessionIndex >= sessions.length) {
          return undefined; // No valid session selected
        }
        // Returns the decrypted session from in-memory state
        return sessions[currentSessionIndex];
      },

      // Gets the memory prompt string if it exists (assumed decrypted)
      getMemoryPromptContent(): string | undefined {
          return get().currentSession()?.memoryPrompt;
      },

      // Updates memory prompt and related indices (used after summarization action)
      updateMemoryPrompt(sessionId: UUID, prompt: string, lastSummarizeIndex: number) {
          // Prompt is likely generated and used in decrypted form
          get().updateTargetSession({ id: sessionId }, (session) => {
              session.memoryPrompt = prompt;
              session.lastSummarizeIndex = lastSummarizeIndex;
          });
          // Encryption happens when saving state via wrapper
      },

      // Clears context up to a certain message index
      clearHistoryContext(index: number) {
        const session = get().currentSession();
        if (!session) return;
        get().updateTargetSession(session, (sess) => {
            sess.clearContextIndex = index;
            sess.memoryPrompt = ""; // Also clear memory prompt when context is cleared
            sess.lastSummarizeIndex = 0; // Reset summarize index
        });
      },

      // Resets the current session's messages and memory prompt
      // resetCurrentSessionMessages() {
      //   const session = get().currentSession();
      //   if (!session) return;
      //   get().updateTargetSession(session, (sess) => {
      //       sess.messages = []; // BOT_HELLO content is static, assumed decrypted
      //       sess.memoryPrompt = "";
      //       sess.clearContextIndex = 0;
      //       sess.lastSummarizeIndex = 0;
      //       sess.stat = { tokenCount: 0, wordCount: 0, charCount: 0 }; // Reset stats
      //       sess.messagesLoadState = MessagesLoadState.FULL; // Since we reset to BOT_HELLO, it's "fully loaded" locally
      //       sess.serverMessagesCursor = undefined;
      //   });
      // },

      // Updates session stats (synchronous) - operates on decrypted message content
      updateStat(message: ChatMessage) {
          const session = get().currentSession();
          if (!session || message.isError || message.streaming) return; // Only update for final, non-error messages

          const content = getMessageTextContent(message); // Use util on decrypted content
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          // We need estimateTokenLength back or handled in actions
          // For now, let's assume token count update happens in actions or isn't critical here
          // const tokenCount = estimateTokenLength(content);

          get().updateTargetSession(session, (sess) => {
            sess.stat = {
                ...sess.stat,
                charCount: (sess.stat?.charCount || 0) + content.length,
                wordCount: (sess.stat?.wordCount || 0) + wordCount,
                // tokenCount: (sess.stat?.tokenCount || 0) + tokenCount,
            };
          });
      },

      // Removed clearAllData - This is dangerous, should be an action with confirmation? Or handled by Auth listener logout.
      // We keep a simple state reset for logout scenario.
      clearCurrentStateToDefault() {
          console.log("[ChatStore] Resetting chat state to default.");
          // TODO: Implement this
        //   set({ ...DEFAULT_CHAT_STATE, sessions: [createNewSession()], currentSessionIndex: 0 }); // Ensure one empty session
      },

      setLastInput(lastInput: string) {
        set({ lastInput }); // lastInput is likely fine unencrypted
      },

      updateCurrentSessionConfigForProvider(provider: ServiceProvider) {
          const session = get().currentSession();
          if (!session) return;

          const defaultModelName = DEFAULT_PANDA_MODEL_NAME;
          const defaultProviderName = ServiceProvider.Panda;

          get().updateTargetSession(session, (sess) => {
            sess.modelConfig = {
              ...sess.modelConfig,
              name: defaultModelName as ModelType,
            };
          });
      },

      updateCurrentSessionModel(newModelConfig: ModelConfig) {
          const session = get().currentSession();
          console.log("[Update Current Session Model - Store] ", newModelConfig);
          if (!session) return;
          console.log("session", session);

          get().updateTargetSession(session, (sess) => {
            // sess.modelConfig is typed as ModelConfig from app/constant.ts
            sess.modelConfig = newModelConfig;
          });
      },

      // Called by loadSessionsFromServer action after successful API call
      // Expects serverConvos to have titles already decrypted by ApiService
      _onServerSessionsLoaded(serverConvos: Conversation[]) {
          const localSessions = _get().sessions;
          const { mergedSessions, newCurrentIndex } = mergeSessions(localSessions, serverConvos);
          set({
              sessions: mergedSessions,
              currentSessionIndex: newCurrentIndex
          });
      },

      // Called by loadMessagesForSession action after successful API call
      // Expects serverApiMessages to have content already decrypted by ApiService
      // _onServerMessagesLoaded(
      //     sessionId: UUID,
      //     serverApiMessages: ApiMessage[],
      //     hasMore: boolean,
      //     nextCursor: string | null
      // ) {
      //     // Map API messages (decrypted by ApiService) to ChatMessage format
      //     const serverMessages = serverApiMessages.map(m => ({
      //         id: m.message_id,
      //         role: m.sender_type === SenderTypeEnum.USER ? 'user' : 'system',
      //         content: m.content, // Content is now directly used (assumed string | MultimodalContent[])
      //         date: new Date(m.timestamp),
      //         syncState: 'synced'
      //     } as ChatMessage));


      //     get().updateTargetSession({ id: sessionId }, (sess) => {
      //         // Merge server messages with local messages
      //         const { mergedMessages } = mergeMessages(sess.messages, serverMessages, sess.messagesLoadState ?? 'none');
      //         sess.messages = mergedMessages as ChatMessage[];
      //         sess.messagesLoadState = hasMore ? MessagesLoadState.PARTIAL : MessagesLoadState.FULL;
      //         sess.serverMessagesCursor = nextCursor ?? undefined; // nextCursor can be string | null
      //     });
      // },

      // // Called by loadMessagesForSession action after failed API call
      // _setMessagesLoadState(sessionId: UUID, loadState: MessagesLoadState) {
      //     get().updateTargetSession({ id: sessionId }, (sess) => {
      //         sess.messagesLoadState = loadState;
      //     });
      // },

      // // Called by saveMessageToServer action after successful API call
      // // Expects savedMessage to have content already decrypted by ApiService
      // _onMessageSyncSuccess(sessionId: UUID, localMessageId: string, savedMessage: ApiMessage) {
      //     get().updateTargetSession({ id: sessionId }, (sess) => {
      //         const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
      //         if (msgIndex !== -1) {
      //             const updatedMessage: ChatMessage = {
      //                ...sess.messages[msgIndex],
      //                content: savedMessage.content, // Update with content from server response (already correct type)
      //                id: savedMessage.message_id, // Update ID to server ID
      //                syncState: MessageSyncState.SYNCED,
      //                isError: false, // Clear error on success
      //                date: new Date(savedMessage.timestamp), // Update timestamp from server
      //             };
      //             sess.messages = [
      //                 ...sess.messages.slice(0, msgIndex),
      //                 updatedMessage,
      //                 ...sess.messages.slice(msgIndex + 1),
      //             ] as ChatMessage[];
      //              console.log(`[ChatStore] Synced local msg ${localMessageId} to server msg ${savedMessage.message_id}`);
      //         } else {
      //             console.warn(`[ChatStore] Could not find local message ${localMessageId} to mark as synced.`);
      //         }
      //     });
      // },

      //  // Called by saveMessageToServer action after failed API call
      // _onMessageSyncError(sessionId: UUID, localMessageId: string) {
      //      get().updateTargetSession({ id: sessionId }, (sess) => {
      //         const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
      //         if (msgIndex !== -1) {
      //             const updatedMessage: ChatMessage = {
      //                ...sess.messages[msgIndex],
      //                syncState: MessageSyncState.ERROR,
      //                isError: true, // Mark as error
      //             };
      //              sess.messages = [
      //                 ...sess.messages.slice(0, msgIndex),
      //                 updatedMessage,
      //                 ...sess.messages.slice(msgIndex + 1),
      //             ] as ChatMessage[];
      //             console.log(`[ChatStore] Marked local msg ${localMessageId} as error after sync fail.`);
      //         } else {
      //               console.warn(`[ChatStore] Could not find local message ${localMessageId} to mark as error.`);
      //         }
      //     });
      // },

      // --- Getters needed by Actions/Components ---

      // Simplified getMessagesWithMemory - operates on decrypted state
      // Actual token counting / message slicing for API call should happen in actions
      // getMemoryContextPrompts(modelConfig: ModelConfig): { systemPrompts: ChatMessage[], memoryPrompt?: ChatMessage, contextPrompts: ChatMessage[] } {
      //   const session = get().currentSession();
      //   if (!session) return { systemPrompts: [], contextPrompts: [] };

      //   const systemPrompts: ChatMessage[] = [];
      //   // Simplified system prompt creation - fillTemplateWith moved, assume action handles it
      //   // Content here is assumed decrypted for LLM processing
      //   systemPrompts.push(createMessage({ role: "system", content: `System prompt for ${modelConfig.name}` })); // Placeholder content

      //   let memoryPrompt: ChatMessage | undefined = undefined;
      //   const shouldSendLongTermMemory = modelConfig.sendMemory && session.memoryPrompt && session.memoryPrompt.length > 0;
      //   if (shouldSendLongTermMemory) {
      //       // Memory prompt content is assumed decrypted
      //       memoryPrompt = createMessage({ role: "system", content: Locale.Store.Prompt.History(session.memoryPrompt), date: new Date() });
      //   }
      //   // Context messages are assumed decrypted
      //   const contextPrompts = session.context.slice(); // Assuming context is already ChatMessage[]

      //   return { systemPrompts, memoryPrompt, contextPrompts };
      // },

      // Retrieves recent messages based on count, skipping errors
      // Used by actions before sending to API (content will be encrypted by ApiService)
      // getRecentMessagesForApi(count: number): ChatMessage[] {
      //     const session = get().currentSession();
      //     if (!session) return [];
      //     const messages = session.messages; // Decrypted messages
      //     const recentMessages: ChatMessage[] = [];
      //     for (let i = messages.length - 1; i >= 0 && recentMessages.length < count; i--) {
      //         const msg = messages[i];
      //         if (!msg.isError) { // Skip messages marked as errors
      //             recentMessages.push(msg);
      //         }
      //     }
      //     return recentMessages.reverse(); // Return in chronological order (decrypted)
      // },

      // --- New methods for chat interaction state ---
      setOnSendMessageHandler: (handler: ((input: string, files: {url: string, fileId: string, type: string, name: string}[]) => Promise<void>) | null) => {
        set({ onSendMessageHandler: handler });
      },
      setHitBottom: (isAtBottom: boolean) => {
        set({ hitBottom: isAtBottom });
      },
      setScrollToBottomHandler: (handler: (() => void) | null) => {
        set({ scrollToBottomHandler: handler });
      },
      setShowPromptModalHandler: (handler: (() => void) | null) => {
        set({ showPromptModalHandler: handler });
      },
      setShowShortcutKeyModalHandler: (handler: (() => void) | null) => {
        set({ showShortcutKeyModalHandler: handler });
      },
      setIsChatComponentBusy: (isBusy: boolean) => {
        set({ isChatComponentBusy: isBusy });
      },
      // Method to clear handlers, e.g., when ChatComponent unmounts or session changes
      clearChatInteractionHandlers: () => {
        set({
          onSendMessageHandler: null,
          // hitBottom: true, // Don't reset hitBottom, it reflects current scroll state
          scrollToBottomHandler: null,
          showPromptModalHandler: null,
          showShortcutKeyModalHandler: null,
          isChatComponentBusy: false, // Reset busy state
        });
      },
    };

    return { ...methods };
  },
  {
    name: StoreKey.Chat,
    version: 1.1, // Incremented version due to new state fields

    storage: createJSONStorage(() => indexedDBStorage), // Use indexedDBStorage directly

    onRehydrateStorage: (state) => {
      console.log("[ChatStore] Hydration finished.");
      return (hydratedState, error) => {
          if (error) {
              console.error("[ChatStore] Error during rehydration:", error);
          } else {
               console.log("[ChatStore] Rehydration successful.");
          }
      }
    },
    migrate(persistedState: any, version: number) {
      const state = persistedState as Partial<ChatState>;
      if (version < 1.1 && state) {
        console.log("[ChatStore Migration] Migrating state from version < 1.1 to add chat interaction state.");
        state.onSendMessageHandler = null;
        state.hitBottom = true; // Default for existing users
        state.scrollToBottomHandler = null;
        state.showPromptModalHandler = null;
        state.showShortcutKeyModalHandler = null;
        state.isChatComponentBusy = false;
      }
      // Add any other migrations from previous versions here
      return state as HydratedChatState;
    },
  },
);

// --- Auth Listener ---
// Uses the action hook to trigger data loading/clearing based on auth state.
export function AuthChatListener() {
  const { ready, authenticated } = usePrivy();
  const apiClient = useApiClient();

  // Direct store access for synchronous state clearing on logout
  const clearState = useChatStore((state) => state.clearCurrentStateToDefault);

  // Get actions from the hook
  const actions = useChatActions();

  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    // Wait for Privy readiness and API client availability
    if (!ready || !apiClient) {
        // console.log("[AuthChatListener] Waiting for Privy ready and API client...");
        return;
    }

    const isInitialCheck = prevAuthState === null;
    const authChanged = !isInitialCheck && authenticated !== prevAuthState;

    // console.log(`[AuthChatListener] Status: ready=${ready}, authenticated=${authenticated}, prevAuth=${prevAuthState}, initialLoadDone=${initialLoadDone}, apiClient=${!!apiClient}`);

    if (isInitialCheck) {
        // console.log("[AuthChatListener] Initial check. Setting prevAuthState.");
        setPrevAuthState(authenticated);
    }

    // Load data on initial authentication or if auth changes to authenticated
    if (authenticated && (!initialLoadDone || authChanged)) {
        console.log("[AuthChatListener] User authenticated. Triggering load/sync...");
        // Use the action from the hook
        actions.loadSessionsFromServer();
        // We could add sync logic here if needed: actions.synchronizePendingData();
        setInitialLoadDone(true); // Mark initial load attempt as done
    } else if (authChanged && !authenticated) {
        // User logged out
        console.log(`[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}. Clearing local state.`);
        // Use the synchronous store method for clearing state on logout
        clearState();
        setInitialLoadDone(false); // Reset initial load flag
    } else if (!authenticated && !isInitialCheck && initialLoadDone) {
         // Edge case: Logged out state detected after initial load was marked done
         console.log("[AuthChatListener] State inconsistency detected (logged out but initialLoadDone=true). Clearing data.");
         clearState();
         setInitialLoadDone(false); // Reset flag
    }

    // Update prevAuthState if auth state changed
    if (authChanged) {
        setPrevAuthState(authenticated);
    }

  }, [ready, authenticated, prevAuthState, initialLoadDone, apiClient, actions, clearState]); // Add actions and clearState to dependencies

  return null; // Component doesn't render anything
}
