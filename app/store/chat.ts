import {
  getMessageTextContent,
  safeLocalStorage,
  // trimTopic, // Moved to chatUtils
} from "@/app/utils";

import { indexedDBStorage } from "@/app/utils/indexedDB-storage";
import { nanoid } from "nanoid";
// Removed API Client types, they belong in the service/actions
// import type { ClientApi, MultimodalContent, RequestMessage } from "@/app/client/api";
// import {
//   Conversation,
//   ConversationCreateRequest,
//   ConversationUpdateRequest,
//   GetConversationMessagesParams,
//   Message as ApiMessage,
//   MessageCreateRequest,
//   PaginatedConversationsResponse,
//   PaginatedMessagesResponse,
//   HTTPValidationError,
//   SenderTypeEnum,
// } from "@/app/client/types";
import { UUID } from "crypto";
// import { ChatControllerPool } from "@/app/client/controller"; // Controller logic moved out
// import { showToast } from "../components/ui-lib";
import {
  DEFAULT_INPUT_TEMPLATE, // Keep if fillTemplateWith is used locally? No, moved.
  DEFAULT_MODELS, // Keep if fillTemplateWith is used locally? No, moved.
  DEFAULT_SYSTEM_TEMPLATE, // Keep if fillTemplateWith is used locally? No, moved.
  KnowledgeCutOffDate, // Keep if fillTemplateWith is used locally? No, moved.
  ServiceProvider,
  StoreKey,
  SUMMARIZE_MODEL, // Keep if getSummarizeModel is used locally? No, moved.
  DEFAULT_OPENAI_MODEL_NAME,
  DEFAULT_PANDA_MODEL_NAME,
} from "../constant";
import Locale, { getLang } from "../locales";
import { prettyObject } from "../utils/format";
import { createPersistStore } from "../utils/store";
// import { estimateTokenLength } from "../utils/token"; // Moved to countMessages in chatUtils
import { ModelConfig, ModelType, useAppConfig } from "./config";
// import { useAccessStore } from "./access"; // Needed for getSummarizeModel? No, moved.
// import { collectModelsWithDefaultModel } from "../utils/model"; // Needed for getSummarizeModel? No, moved.
import { countMessages } from "../utils/chatUtils"; // Import from new location if needed

import { ChatMessage, createMessage, MessageRole, MessageSyncState } from "@/app/types/chat";
import { ChatSession, createEmptySession, SessionSyncState, MessagesLoadState } from "@/app/types/session";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useApiClient } from "../context/ApiProviderContext";
import type { ClientApi, MultimodalContent } from "@/app/client/api"; // Added MultimodalContent
import { Conversation, Message as ApiMessage, SenderTypeEnum } from "@/app/client/types"; // Added SenderTypeEnum

const localStorage = safeLocalStorage();

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic; // Use locale
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
  syncState: 'synced', // Bot hello is always synced
});

// Removed mapping functions - moved to ChatApiService.ts
// function mapConversationToSession(conversation: Conversation): ChatSession { ... }
// function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage { ... }
// function mapRoleToSenderType(role: MessageRole): SenderTypeEnum { ... }

// Removed utility functions - moved to chatUtils.ts
// function getSummarizeModel(...) { ... }
// function countMessages(...) { ... } // Now imported if needed
// function fillTemplateWith(...) { ... }

const DEFAULT_CHAT_STATE = {
  sessions: [] as ChatSession[], // Initialize as empty, will be loaded/merged
  currentSessionIndex: -1, // Start with no session selected
  lastInput: "",
};

export const useChatStore = createPersistStore(
  DEFAULT_CHAT_STATE,
  (set, _get) => {
    function get() {
      return {
        ..._get(),
        ...methods,
      };
    }

    // Merging logic stays within the store as it directly manipulates state
    function mergeSessions(localSessions: ChatSession[], serverConvos: Conversation[]): { mergedSessions: ChatSession[], newCurrentIndex: number } {
        const serverConvoMap = new Map(serverConvos.map(c => [c.conversation_id, c]));
        const mergedSessions: ChatSession[] = [];
        const usedServerIds = new Set<UUID>();
        const currentSession = get().currentSession(); // Get current session before merge

        localSessions.forEach(localSession => {
            const serverId = localSession.conversationId;
            if (serverId && serverConvoMap.has(serverId)) {
                const serverConvo = serverConvoMap.get(serverId)!;
                // Merge: Prioritize server title, keep local messages (until loaded), take max update time
                mergedSessions.push({
                    ...localSession,
                    topic: serverConvo.title || localSession.topic || DEFAULT_TOPIC,
                    lastUpdate: Math.max(localSession.lastUpdate, new Date(serverConvo.updated_at).getTime()),
                    syncState: 'synced', // Mark as synced if server version exists
                    messagesLoadState: localSession.messagesLoadState === 'full' ? 'full' : 'none', // Reset load state unless fully loaded
                });
                usedServerIds.add(serverId);
            } else if (!serverId && localSession.syncState === 'pending_create') {
                // Keep local-only sessions pending creation
                mergedSessions.push(localSession);
            } else if (!serverId) {
                 // Keep purely local sessions (maybe user created offline and never synced)
                 console.log(`[Merge] Keeping local-only session ${localSession.id}`);
                 mergedSessions.push({ ...localSession, syncState: 'local' }); // Mark as local
            } else {
                 // Local session points to a server ID that doesn't exist anymore (deleted elsewhere?)
                 console.warn(`[Merge] Local session ${localSession.id} points to deleted server ConvID ${serverId}. Keeping as local.`);
                 mergedSessions.push({ ...localSession, conversationId: undefined, syncState: 'local', topic: localSession.topic || DEFAULT_TOPIC });
            }
        });

        // Add server conversations that weren't in local state
        serverConvoMap.forEach((serverConvo, serverId) => {
            if (!usedServerIds.has(serverId)) {
                // Convert server convo to local session format
                const newLocalSession = createEmptySession();
                newLocalSession.conversationId = serverConvo.conversation_id;
                newLocalSession.topic = serverConvo.title || DEFAULT_TOPIC;
                newLocalSession.lastUpdate = new Date(serverConvo.updated_at).getTime();
                newLocalSession.messages = [BOT_HELLO]; // Start with bot hello
                newLocalSession.syncState = 'synced';
                newLocalSession.messagesLoadState = 'none'; // Needs loading
                mergedSessions.push(newLocalSession);
                console.log(`[Merge] Added new session from server: ${serverId}`);
            }
        });

         // Ensure there's always at least one session (create a new local one if needed)
         if (mergedSessions.length === 0) {
             console.log("[Merge] No sessions after merge, creating a default local session.");
             mergedSessions.push(createEmptySession()); // Creates a 'local' session
         }

        // Sort sessions by last update time (most recent first)
        mergedSessions.sort((a, b) => b.lastUpdate - a.lastUpdate);

        // Determine the new currentSessionIndex
        let newCurrentIndex = 0; // Default to the first (most recent)
        if (currentSession) {
           // Try to find the previously selected session in the merged list
           const idx = mergedSessions.findIndex(s =>
               (s.id && s.id === currentSession.id) ||
               (s.conversationId && s.conversationId === currentSession.conversationId)
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
            messageMap.set(msg.id, { ...msg, syncState: 'synced', isError: false, streaming: false }); // Assume server messages are final
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
      // --- Synchronous State Updates ---

      _setState: set, // Expose set for direct updates from actions if necessary (use carefully)

      setCurrentSessionIndex(index: number) {
          const sessions = _get().sessions;
          if (index >= 0 && index < sessions.length) {
            set({ currentSessionIndex: index });
          } else if (sessions.length > 0) {
            set({ currentSessionIndex: 0 }); // Default to first if index is invalid
          } else {
            set({ currentSessionIndex: -1 }); // No sessions, no selection
          }
      },

      setSessions(sessions: ChatSession[], currentSessionIndex?: number) {
          const newIndex = currentSessionIndex ?? (sessions.length > 0 ? 0 : -1);
          set({
              sessions: sessions,
              currentSessionIndex: newIndex
          });
      },

      // Adds a new session to the beginning of the list and selects it
      addSession(session: ChatSession) {
         set(state => ({
             sessions: [session, ...state.sessions],
             currentSessionIndex: 0, // Select the new session
         }));
      },

      // Removes a session by index
      removeSession(index: number) {
          const sessions = _get().sessions.slice();
          if (index < 0 || index >= sessions.length) return; // Invalid index

          sessions.splice(index, 1);

          const currentIdx = _get().currentSessionIndex;
          let nextIndex = currentIdx;

          if (sessions.length === 0) {
              // If no sessions left, add a new empty local one and select it
              const newSession = createEmptySession();
              set({ sessions: [newSession], currentSessionIndex: 0 });
              return;
          }

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
          identifier: { id?: string; conversationId?: UUID },
          updater: (session: ChatSession) => void // Can modify session draft
      ) {
          set(state => {
             let index = -1;
             if (identifier.id) {
                 index = state.sessions.findIndex(s => s.id === identifier.id);
             }
             // Fallback to conversationId if id not found or not provided
             if (index === -1 && identifier.conversationId) {
                 index = state.sessions.findIndex(s => s.conversationId === identifier.conversationId);
             }

             if (index === -1) {
                 console.warn(`[updateTargetSession] Session not found for identifier:`, identifier);
                 return state; // Return current state if no session found
             }

             const newSessions = [...state.sessions];
             const sessionToUpdate = { ...newSessions[index] }; // Shallow copy to modify

             // Apply the updates immutably
             updater(sessionToUpdate);

             // Create a new object reference for the updated session
             newSessions[index] = sessionToUpdate;

             // Return the new state
             return { ...state, sessions: newSessions };
          });
      },

      // Example: Add a message to the current session (synchronous part)
      addUserMessage(content: string | MultimodalContent[]) {
          const currentSession = get().currentSession();
          if (!currentSession) return null;

          const userMessage = createMessage({
              role: "user",
              content: content,
              syncState: 'pending_create', // Mark as needing to be sent
          });

          get().updateTargetSession(currentSession, (session) => {
              session.messages = [...session.messages, userMessage];
              session.lastUpdate = Date.now(); // Update timestamp
          });
          return userMessage; // Return the created message for potential use in actions
      },

      // Example: Add a placeholder for bot response (synchronous part)
      addBotMessagePlaceholder(model: ModelType | string) {
          const currentSession = get().currentSession();
          if (!currentSession) return null;

          const botMessage = createMessage({
              role: "assistant",
              content: "", // Start empty
              streaming: true,
              model: model as ModelType, // Store the model used
              syncState: 'pending_create', // Also needs saving eventually
          });

          get().updateTargetSession(currentSession, (session) => {
              session.messages = [...session.messages, botMessage];
              // Don't update lastUpdate here, wait for bot response finish
          });
          return botMessage; // Return the placeholder
      },

      // Update a specific message (e.g., for streaming updates, setting sync state)
      updateMessage(
          sessionId: string | undefined,
          messageId: string,
          updater: (message: ChatMessage) => void
      ) {
          const sessionIdentifier = sessionId ? { id: sessionId } : get().currentSession();
          if (!sessionIdentifier) return;

          get().updateTargetSession(sessionIdentifier, (session) => {
              const msgIndex = session.messages.findIndex(m => m.id === messageId);
              if (msgIndex !== -1) {
                  const messageToUpdate = { ...session.messages[msgIndex] }; // Shallow copy
                  updater(messageToUpdate);
                  session.messages = [
                      ...session.messages.slice(0, msgIndex),
                      messageToUpdate,
                      ...session.messages.slice(msgIndex + 1),
                  ];
                  // Optionally update session lastUpdate time if message content is finalized
                  if (!messageToUpdate.streaming && messageToUpdate.syncState !== 'pending_create') {
                      session.lastUpdate = Date.now();
                  }
              } else {
                   console.warn(`[updateMessage] Message ${messageId} not found in session ${sessionId || sessionIdentifier.id}`);
              }
          });
      },

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
          const newSession = createEmptySession(); // Creates a 'local' session
          set({
            sessions: [newSession],
            currentSessionIndex: 0,
            lastInput: "", // Also clear last input
          });
      },

      // Renamed from selectSession to avoid implying async ops
      _selectSessionIndex(index: number) {
        set({ currentSessionIndex: index });
        // Loading messages is now an action, triggered elsewhere
      },

      // Removed newSession - complex logic moved to actions
      // Removed deleteSession - complex logic moved to actions

      currentSession() {
        const { sessions, currentSessionIndex } = _get();
        if (currentSessionIndex < 0 || currentSessionIndex >= sessions.length) {
          return undefined; // No valid session selected
        }
        return sessions[currentSessionIndex];
      },

      // Removed onNewMessage - logic handled by updateMessage/actions
      // Removed onUserInput - complex logic moved to actions

      // --- Memory/Prompt Related (Keep simple getters/setters if state-related) ---

      // Gets the memory prompt string if it exists
      getMemoryPromptContent(): string | undefined {
          return get().currentSession()?.memoryPrompt;
      },

      // Updates memory prompt and related indices (used after summarization action)
      updateMemoryPrompt(sessionId: string, prompt: string, lastSummarizeIndex: number) {
          get().updateTargetSession({ id: sessionId }, (session) => {
              session.memoryPrompt = prompt;
              session.lastSummarizeIndex = lastSummarizeIndex;
          });
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
      resetCurrentSessionMessages() {
        const session = get().currentSession();
        if (!session) return;
        get().updateTargetSession(session, (sess) => {
            sess.messages = [BOT_HELLO];
            sess.memoryPrompt = "";
            sess.clearContextIndex = 0;
            sess.lastSummarizeIndex = 0;
            sess.stat = { tokenCount: 0, wordCount: 0, charCount: 0 }; // Reset stats
            sess.messagesLoadState = 'full'; // Since we reset to BOT_HELLO, it's "fully loaded" locally
            sess.serverMessagesCursor = undefined;
        });
      },

      // Removed summarizeSession - complex logic moved to actions
      // Removed getSummarizeModelConfig - uses moved utils
      // Removed summarizeTopicIfNeeded - complex logic moved to actions
      // Removed summarizeMessagesIfNeeded - complex logic moved to actions
      // Removed performSummarization - complex logic moved to actions

      // Updates session stats (synchronous)
      updateStat(message: ChatMessage) {
          const session = get().currentSession();
          if (!session || message.isError || message.streaming) return; // Only update for final, non-error messages

          const content = getMessageTextContent(message); // Use util
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
          set({ ...DEFAULT_CHAT_STATE, sessions: [createEmptySession()], currentSessionIndex: 0 }); // Ensure one empty session
      },

      setLastInput(lastInput: string) {
        set({ lastInput });
      },

      updateCurrentSessionConfigForProvider(provider: ServiceProvider) {
          const session = get().currentSession();
          if (!session) return;

          let defaultModelName = DEFAULT_OPENAI_MODEL_NAME;
          let defaultProviderName = ServiceProvider.OpenAI;

          if (provider === ServiceProvider.Panda) {
            defaultModelName = DEFAULT_PANDA_MODEL_NAME;
            defaultProviderName = ServiceProvider.Panda;
          }

          get().updateTargetSession(session, (sess) => {
            sess.modelConfig = {
              ...sess.modelConfig,
              model: defaultModelName as ModelType,
              providerName: defaultProviderName,
            };
          });
      },

      updateCurrentSessionModel(model: ModelType, providerName: ServiceProvider) {
          const session = get().currentSession();
          console.log("[Update Current Session Model - Store] ", model, providerName);
          if (!session) return;

          get().updateTargetSession(session, (sess) => {
            sess.modelConfig = {
              ...sess.modelConfig,
              model: model,
              providerName: providerName,
            };
          });
      },

      // Removed generateSessionTitle - complex logic moved to actions

      // --- Server Interaction State Updates (called by actions) ---

      // Called by loadSessionsFromServer action after successful API call
      _onServerSessionsLoaded(serverConvos: Conversation[]) {
          const localSessions = _get().sessions;
          const { mergedSessions, newCurrentIndex } = mergeSessions(localSessions, serverConvos);
          set({
              sessions: mergedSessions,
              currentSessionIndex: newCurrentIndex
          });
      },

      // Called by loadMessagesForSession action before API call
      _setMessagesLoading(conversationId: UUID) {
          get().updateTargetSession({ conversationId }, (sess) => {
              sess.messagesLoadState = 'loading';
          });
      },

      // Called by loadMessagesForSession action after successful API call
      _onServerMessagesLoaded(
          conversationId: UUID,
          serverApiMessages: ApiMessage[],
          hasMore: boolean,
          nextCursor: string | null
      ) {
          // Need mapApiMessageToChatMessage from service
          // This suggests mapping might belong elsewhere or passed in
          // For now, assume the action layer does the mapping before calling this
          // Let's adjust signature later if needed. Assume serverMessages are ChatMessage[]
          const serverMessages = serverApiMessages.map(m => ({ // Temporary mapping here
              id: m.message_id,
              role: m.sender_type === SenderTypeEnum.USER ? 'user' : 'assistant', // Fixed: Use imported SenderTypeEnum
              content: m.content,
              date: new Date(m.timestamp).toLocaleString(),
              syncState: 'synced'
          } as ChatMessage));


          get().updateTargetSession({ conversationId }, (sess) => {
              // Fixed: Provide default for potentially undefined messagesLoadState
              const { mergedMessages } = mergeMessages(sess.messages, serverMessages, sess.messagesLoadState ?? 'none');
              sess.messages = mergedMessages;
              sess.messagesLoadState = hasMore ? 'partial' : 'full';
              sess.serverMessagesCursor = nextCursor;
          });
      },

      // Called by loadMessagesForSession action after failed API call
      _setMessagesError(conversationId: UUID) {
          get().updateTargetSession({ conversationId }, (sess) => {
              sess.messagesLoadState = 'error';
          });
      },

      // Called by saveMessageToServer action after successful API call
      _onMessageSyncSuccess(conversationId: UUID, localMessageId: string, savedMessage: ApiMessage) {
          get().updateTargetSession({ conversationId }, (sess) => {
              const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
              if (msgIndex !== -1) {
                  const updatedMessage: ChatMessage = {
                     ...sess.messages[msgIndex],
                     id: savedMessage.message_id, // Update ID to server ID
                     syncState: 'synced',
                     isError: false, // Clear error on success
                     date: new Date(savedMessage.timestamp).toLocaleString(), // Update timestamp from server
                  };
                  sess.messages = [
                      ...sess.messages.slice(0, msgIndex),
                      updatedMessage,
                      ...sess.messages.slice(msgIndex + 1),
                  ];
                   console.log(`[ChatStore] Synced local msg ${localMessageId} to server msg ${savedMessage.message_id}`);
              } else {
                  console.warn(`[ChatStore] Could not find local message ${localMessageId} to mark as synced.`);
              }
          });
      },

       // Called by saveMessageToServer action after failed API call
      _onMessageSyncError(conversationId: UUID, localMessageId: string) {
           get().updateTargetSession({ conversationId }, (sess) => {
              const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
              if (msgIndex !== -1) {
                  const updatedMessage: ChatMessage = {
                     ...sess.messages[msgIndex],
                     syncState: 'error',
                     isError: true, // Mark as error
                  };
                   sess.messages = [
                      ...sess.messages.slice(0, msgIndex),
                      updatedMessage,
                      ...sess.messages.slice(msgIndex + 1),
                  ];
                  console.log(`[ChatStore] Marked local msg ${localMessageId} as error after sync fail.`);
              } else {
                    console.warn(`[ChatStore] Could not find local message ${localMessageId} to mark as error.`);
              }
          });
      },

      // --- Getters needed by Actions/Components ---

      // Simplified getMessagesWithMemory - only prepares context/memory prompts based on state
      // Actual token counting / message slicing for API call should happen in actions
      getMemoryContextPrompts(modelConfig: ModelConfig): { systemPrompts: ChatMessage[], memoryPrompt?: ChatMessage, contextPrompts: ChatMessage[] } {
        const session = get().currentSession();
        if (!session) return { systemPrompts: [], contextPrompts: [] };

        const systemPrompts: ChatMessage[] = [];
        // Simplified system prompt creation - fillTemplateWith moved, assume action handles it
        systemPrompts.push(createMessage({ role: "system", content: `System prompt for ${modelConfig.model}` })); // Placeholder content

        let memoryPrompt: ChatMessage | undefined = undefined;
        const shouldSendLongTermMemory = modelConfig.sendMemory && session.memoryPrompt && session.memoryPrompt.length > 0;
        if (shouldSendLongTermMemory) {
            memoryPrompt = createMessage({ role: "system", content: Locale.Store.Prompt.History(session.memoryPrompt), date: "" });
        }

        const contextPrompts = session.context.slice(); // Assuming context is already ChatMessage[]

        return { systemPrompts, memoryPrompt, contextPrompts };
      },

      // Retrieves recent messages based on count, skipping errors
      // Used by actions before sending to API
      getRecentMessagesForApi(count: number): ChatMessage[] {
          const session = get().currentSession();
          if (!session) return [];
          const messages = session.messages;
          const recentMessages: ChatMessage[] = [];
          for (let i = messages.length - 1; i >= 0 && recentMessages.length < count; i--) {
              const msg = messages[i];
              if (!msg.isError) { // Skip messages marked as errors
                  recentMessages.push(msg);
              }
          }
          return recentMessages.reverse(); // Return in chronological order
      },

      // --- Removed complex methods involving API calls or heavy logic ---
      // loadSessionsFromServer - Now an action
      // loadMessagesForSession - Now an action
      // saveMessageToServer - Now an action
      // getMessagesWithMemory - Simplified above, complex part moved to actions
      // getSystemPrompts - Simplified above
      // getMemoryPrompts - Simplified into getMemoryContextPrompts
      // getRecentMessages - Simplified into getRecentMessagesForApi
    };

    return { ...methods };
  },
  {
    name: StoreKey.Chat,
    version: 1.1, // Incremented version due to state structure changes (removed direct API deps)
    storage: indexedDBStorage as any, // Use indexedDB
    migrate(persistedState: any, version: number) {
        if (version < 1.1) {
             // Migration logic if needed from v1.0 to v1.1
             // e.g., initialize new state fields, clean up old ones
             console.log("[ChatStore Migration] Migrating state from version < 1.1");
             const state = persistedState as typeof DEFAULT_CHAT_STATE;
             // Example: ensure sessions is always an array
             if (!Array.isArray(state.sessions)) {
                 state.sessions = [createEmptySession()];
                 state.currentSessionIndex = 0;
             }
             // Ensure syncState exists on sessions
             state.sessions.forEach(s => {
                 if (!s.syncState) s.syncState = s.conversationId ? 'synced' : 'local';
                 if (!s.messagesLoadState) s.messagesLoadState = 'none';
             });
             // Ensure syncState exists on messages
              state.sessions.forEach(s => {
                 s.messages.forEach(m => {
                     if (!m.syncState) m.syncState = 'synced'; // Assume old messages were synced
                 });
             });
        }
        return persistedState;
    },
    onRehydrateStorage: (state) => {
      console.log("[ChatStore] Hydration finished");
      // Optional: Perform actions after hydration, e.g., initial load trigger moved to listener/actions
    },
  },
);

// --- Auth Listener ---
// Stays here for now, but will be modified to call actions instead of store methods directly
export function AuthChatListener() {
  const { ready, authenticated, user } = usePrivy(); // Get user object
  const apiClient = useApiClient();

  // Selectors for state change triggers, not direct method calls anymore
  const storeInitialized = useChatStore((state) => state.sessions.length > 0 || state.currentSessionIndex !== -1);
  const clearState = useChatStore((state) => state.clearCurrentStateToDefault); // Keep for logout

  // Placeholder for actions - these would come from useChatActions() hook
  const actions = {
      loadInitialSessions: (api: ClientApi) => { console.log("[Auth Listener Action Stub] Load Initial Sessions called"); /* Real action needed */ },
      clearLocalChatData: () => { console.log("[Auth Listener Action Stub] Clear Local Chat Data called"); clearState(); /* Simple clear is okay */ },
      synchronizePendingData: (api: ClientApi) => { console.log("[Auth Listener Action Stub] Sync Pending Data called"); /* Real action needed */ },
  };

  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!ready || !apiClient) {
        console.log("[AuthChatListener] Waiting for Privy ready and API client...");
        return; // Wait for both Privy and API client
    }

    const isInitialCheck = prevAuthState === null;
    const authChanged = !isInitialCheck && authenticated !== prevAuthState;

    console.log(`[AuthChatListener] Status: ready=${ready}, authenticated=${authenticated}, prevAuth=${prevAuthState}, initialLoadDone=${initialLoadDone}, apiClient=${!!apiClient}`);

    if (isInitialCheck) {
        console.log("[AuthChatListener] Initial check. Setting prevAuthState.");
        setPrevAuthState(authenticated);
    }

    if (authenticated && !initialLoadDone) {
        console.log("[AuthChatListener] Authenticated and initial load not done. Triggering load/sync...");
        actions.loadInitialSessions(apiClient);
        // Optionally: Add a check for pending data after initial load
        // actions.synchronizePendingData(apiClient);
        setInitialLoadDone(true); // Mark initial load attempt
    } else if (authChanged) {
        console.log(`[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}.`);
        setPrevAuthState(authenticated); // Update previous state
        setInitialLoadDone(false); // Reset initial load flag on auth change

        if (!authenticated) {
            console.log("[AuthChatListener] User logged out. Clearing local chat state via action.");
            actions.clearLocalChatData(); // Call action to clear data
        } else {
             console.log("[AuthChatListener] User re-authenticated. Triggering load/sync...");
             actions.loadInitialSessions(apiClient);
             // actions.synchronizePendingData(apiClient);
             setInitialLoadDone(true);
        }
    } else if (!authenticated && !isInitialCheck && initialLoadDone) {
         // If somehow we are logged out, but initialLoadDone is true (e.g., state persisted), clear data.
         console.log("[AuthChatListener] State inconsistency detected (logged out but initialLoadDone=true). Clearing data.");
         actions.clearLocalChatData();
         setInitialLoadDone(false); // Reset flag
    }

  }, [ready, authenticated, prevAuthState, initialLoadDone, apiClient, actions]); // Add actions to dependency array

  return null; // Component doesn't render anything
}
