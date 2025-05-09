import { useCallback } from 'react';
import { useChatStore } from '@/app/store/chat';
import { ChatApiService, mapApiMessagesToChatMessages, mapApiMessageToChatMessage, mapConversationToSession, mapRoleToSenderType} from '@/app/services/ChatApiService';
import { useApiClient } from '@/app/context/ApiProviderContext';
import { ChatMessage, MessageSyncState } from '@/app/types/chat';
import { MessagesLoadState, SessionSyncState } from '@/app/types/session';
import { ModelConfig, useAppConfig } from '@/app/store/config';
import {
    ConversationCreateRequest,
    MessageCreateRequest,
    GetConversationMessagesParams,
    ConversationUpdateRequest,
    GetConversationsParams
} from '@/app/client/types';
import { UUID } from "crypto";
import { ClientApi, MultimodalContent, RequestMessage } from '@/app/client/api';
import { DEFAULT_TOPIC } from '@/app/store/chat';
import { getMessageTextContent, trimTopic } from "@/app/utils";
import { fillTemplateWith, getSummarizeModel } from "@/app/utils/chatUtils";
import { ChatControllerPool } from "@/app/client/controller";
import { prettyObject } from "@/app/utils/format";
import { ModelType } from "@/app/store/config";
import { ServiceProvider } from "@/app/store/config";
import { EncryptionService } from '../services/EncryptionService';

export function useChatActions() {
    const store = useChatStore();
    const apiClient = useApiClient();
    const appConfig = useAppConfig();

    const loadSessionsFromServer = useCallback(async (options?: { cursor?: string | null, limit?: number }) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot load sessions.");
            return { sessions: [], nextCursor: null, hasMore: false };
        }
        
        const effectiveCursor = options?.cursor;
        const effectiveLimit = options?.limit ?? 20; // Default to 20 if not provided

        console.log(`[ChatActions] Loading sessions from server... Cursor: ${effectiveCursor}, Limit: ${effectiveLimit}`);
        try {
            const apiParams: GetConversationsParams = { limit: effectiveLimit };
            if (effectiveCursor) {
                apiParams.cursor = effectiveCursor;
            }
            const response = await ChatApiService.fetchConversations(apiClient, apiParams);
            
            // Enhanced logging
            console.log(`[ChatActions] Raw API response from fetchConversations: Received ${response.data.length} items. Pagination:`, response.pagination);

            const serverConvos = response.data;
            const pagination = response.pagination;
            console.log(`[ChatActions] Received ${serverConvos.length} sessions from server. Has more: ${pagination.has_more}, Limit: ${effectiveLimit}`);
            
            const sessions = serverConvos.map(mapConversationToSession);
            
            return {
                sessions,
                nextCursor: pagination.next_cursor,
                hasMore: pagination.has_more,
            };

        } catch (error) {
            console.error("[ChatActions] Failed to load sessions from server:", error);
            return { sessions: [], nextCursor: null, hasMore: false }; // Return empty on error
            // Ensure there's at least one session even on error
            // if (store.sessions.length === 0) {
            //      store.addSession(createEmptySession());
            // }
        }
    }, [apiClient]);

    const newSession = useCallback(async (modelConfig?: ModelConfig) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot create session on server.");
            throw new Error("API client not available");
        }

        console.log("[ChatActions] Creating new session...");
        
        const createRequest: ConversationCreateRequest = { title: DEFAULT_TOPIC };

        try {
            const newConversation = await ChatApiService.createConversation(apiClient, createRequest);
            const session = mapConversationToSession(newConversation);

            // Update the existing session in the store with server data
            session.syncState = SessionSyncState.SYNCED;
            session.modelConfig = { ...appConfig.modelConfig, ...modelConfig };
            store.addSession(session);
            
            console.log("[ChatActions] Server session created successfully:", newConversation.conversation_id);
            return session;
        } catch (error) {
            console.error("[ChatActions] Failed to create server session:", error);
            // Optionally show error to user
        }
    }, [apiClient, store, appConfig.modelConfig]);

     const loadMessagesForSession = useCallback(async (id: UUID, params?: { cursor?: string, limit?: number }): Promise<{ messages: ChatMessage[], pagination: { has_more: boolean, next_cursor: string | null } }> => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot load messages.");
            return Promise.reject(new Error("API client not available")); // Consistent promise rejection
        }

        const session = store.sessions.find(s => s.id === id);
        if (!session){
            console.warn(`[ChatActions] Session ${id} not found in store. Skipping message load.`);
            return Promise.reject(new Error(`Session ${id} not found in store.`)); // Consistent promise rejection
        }

        console.log(`[ChatActions] Loading messages for conversation ${id}`);
        // Update store state to loading
        // store._setMessagesLoadState(id, MessagesLoadState.LOADING);

        // Revert to simpler params construction - service layer handles null cursor
        const loadParams: GetConversationMessagesParams = {
             limit: params?.limit ?? 20,
             cursor: params?.cursor, // Pass null/undefined directly
         };

        console.log(`[ChatActions] Effective load params:`, loadParams);

        try {
            // Service layer's fetchMessages will handle null cursor before calling api.app method
            const response = await ChatApiService.fetchMessages(apiClient, id, loadParams);
            const serverApiMessages = response.data;
            const pagination = response.pagination;
            console.log(`[ChatActions] Received ${serverApiMessages.length} messages for ${id}. Has more: ${pagination.has_more}`);

            // Call store's internal method to merge messages and update state
            // store._onServerMessagesLoaded(id, serverApiMessages, pagination.has_more, pagination.next_cursor);
            const chatMessages = mapApiMessagesToChatMessages(serverApiMessages);
            return Promise.resolve({ messages: chatMessages, pagination });

        } catch (error: any) {
            console.error(`[ChatActions] Failed loading messages for ${id}:`, error);
            // Update store state to error
            // store._setMessagesLoadState(id, MessagesLoadState.ERROR);
            return Promise.reject(error);
            // Optionally show error to user
        }
    }, [apiClient, store]);

    // Select Session - now by ID
    const selectSession = useCallback((sessionId: UUID) => {
        const sessions = store.sessions;
        const indexToSelect = sessions.findIndex(s => s.id === sessionId);

        if (indexToSelect === -1) {
            console.warn(`[ChatActions] Session with ID ${sessionId} not found in store. Cannot select.`);
            // Attempt to see if it's in localSessions of ChatList if ChatList passes it?
            // For now, if not in global store, we can't set global index correctly.
            return;
        }

        if (indexToSelect < 0 || indexToSelect >= sessions.length) {
            console.warn(`[ChatActions] Invalid session index derived: ${indexToSelect} for ID ${sessionId}`);
            return;
        }
        // const targetSession = sessions[indexToSelect]; // Not strictly needed anymore for this function

        // Update index in store
        store.setCurrentSessionIndex(indexToSelect);

        // Trigger message loading if needed (logic can remain if currentSession is derived from index)
        // const currentSession = store.currentSession(); // This will be the newly selected one
        // if (currentSession && currentSession.messagesLoadState === 'none') {
        //     console.log(`[ChatActions] Session ${currentSession.id} selected, triggering message load.`);
        //     loadMessagesForSession(currentSession.id);
        // }
    }, [store]); // Removed loadMessagesForSession from deps for now, as it's commented out

    const deleteSession = useCallback(async (sessionId: UUID) => {
        if (!apiClient) {
             console.warn("[ChatActions] API client not available, cannot delete server session.");
             // No server deletion possible, but we can still remove from local store
        }

        const sessions = store.sessions;
        const indexToDelete = sessions.findIndex(s => s.id === sessionId);

        if (indexToDelete === -1) {
            console.error(`[ChatActions] Attempted to delete non-existent session with ID ${sessionId}`);
            return;
        }

        const sessionToDelete = sessions[indexToDelete];
        // const id = sessionToDelete.id; // This is just sessionId

        console.log(`[ChatActions] Deleting session ${indexToDelete} (ID: ${sessionId})`);

        // Remove from store immediately using the found index
        store.removeSession(indexToDelete);

        // Attempt server deletion if applicable
        if (apiClient && sessionToDelete.syncState !== 'pending_create' && sessionToDelete.syncState !== 'local') {
            try {
                await ChatApiService.deleteConversation(apiClient, sessionId); // Use sessionId directly
                console.log(`[ChatActions] Server session ${sessionId} deleted.`);
            } catch (error) {
                console.error(`[ChatActions] Failed to delete server session ${sessionId}:`, error);
                // How to handle? Maybe notify user? Re-add local session?
                // For now, just log error. The session is already removed locally.
            }
        } else {
           console.log(`[ChatActions] Session ${sessionId} was local-only or pending creation, no server deletion needed.`);
        }
    }, [apiClient, store]);

    const saveMessageToServer = useCallback(async (conversationId: UUID, message: ChatMessage) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot save message.");
            // Update local state to error immediately if API isn't available?
            store._onMessageSyncError(conversationId, message.id);
            return;
        }

        const localMessageId = message.id;
        if (!localMessageId) {
            console.error("[saveMessageToServer Action] Message missing local ID, cannot save.", message);
            return;
        }

        // Don't re-save synced messages
        if (message.syncState === 'synced') return;

        const content = getMessageTextContent(message); // Use util to get text
        if (!content) {
            console.warn("[saveMessageToServer Action] Message content is empty, skipping save.", message);
            // If it was pending_create, mark as error?
            // store._onMessageSyncError(conversationId, localMessageId);
            return;
        }

        // Use existing ID if available (for retries), otherwise generate new one for server?
        // The original store logic generated a new UUID here. Let's stick with that.
        // If retries need the same ID, that logic needs adjustment.
        // const messageIdForServer = crypto.randomUUID() as UUID;

        console.log(`[ChatActions] Saving message ${localMessageId} to conversation ${conversationId}`);
        const createRequest: MessageCreateRequest = {
            message_id: message.id,
            sender_type: mapRoleToSenderType(message.role),
            content: content
        };

        try {
            const savedMessage = await ChatApiService.createMessage(apiClient, conversationId, createRequest);
            console.log(`[ChatActions] Message ${localMessageId} saved successfully (Server ID: ${savedMessage.message_id} TS: ${savedMessage.timestamp} ${savedMessage.sender_type})`);
            // Update store state on success
            store._onMessageSyncSuccess(conversationId, localMessageId, savedMessage);
        } catch (error: any) {
            console.error(`[ChatActions] Failed saving message ${localMessageId}:`, error);
            // Update store state on error
            store._onMessageSyncError(conversationId, localMessageId);
            // Optionally show error to user
        }
    }, [apiClient, store]);

    const removeMessages = useCallback(async (messageIds: string[]) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot remove messages.");
            return;
        }
        // TODO: Implement
    }, [apiClient]);

    // --- Title Generation Action --- 
    const generateSessionTitle = useCallback(async (sessionId: UUID, userMessageContent: string, assistantMessageContent: string) => {
        if (!apiClient) {
             console.warn("[ChatActions] API client not available, cannot generate title.");
             return;
        }

        // Fetch the latest session state when the action executes
        const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
        if (!session) {
            console.warn(`[Title Generation Action] Session not found (using getState): ${sessionId}.`);
            return;
        }

        console.log(`[Title Generation Action] Starting for session: ${sessionId}`);
        
        if (session.topic !== DEFAULT_TOPIC) {
            console.log(`[Title Generation Action] Session already has a title, skipping.`);
            return;
        }

        // Determine Model for Title Generation (using compressModel or summarize logic)
        // Adapt logic from original store's getSummarizeModelConfig
        const modelConfig = session.modelConfig;
        let titleModel: string;
        let titleProvider: string;
        if (modelConfig.compressModel) {
             [titleModel, titleProvider] = [modelConfig.compressModel, modelConfig.compressProviderName];
        } else {
             [titleModel, titleProvider] = getSummarizeModel(modelConfig.model, modelConfig.providerName); // Use util
        }

        const titleGenConfig: ModelConfig = {
            ...modelConfig,
            model: titleModel as ModelType,
            providerName: titleProvider as ServiceProvider,
            temperature: 0.3,
            max_tokens: 100,
        };

        // Construct Prompt (similar to original store logic)
        const prompt = `**Prompt**\n\nYou are a chat‑title generator.\n\nInput\nUser: ${userMessageContent}\nAssistant: ${assistantMessageContent}\n\nTask\n1. If the messages revolve around a specific topic, produce a short, informative title (3–6 words, Title Case, no trailing punctuation).\n2. If they are too vague or empty to summarize meaningfully, output exactly:\n   ${DEFAULT_TOPIC}\n\nRules\n- Output **only** the title text (or "${DEFAULT_TOPIC}")—no extra words or quotation marks.\n- Keep the title neutral and descriptive; do not include the words "user" or "assistant".\n`;

        try {
            console.log(`[Title Generation Action] Calling LLM with config:`, titleGenConfig);
            const generatedTitle = await ChatApiService.callLlmGenerateTitle(apiClient, prompt, titleGenConfig);
            console.log(`[Title Generation Action] LLM generated title: "${generatedTitle}"`);

            // Update local state only if the title is new and not the default
            if (generatedTitle !== DEFAULT_TOPIC && generatedTitle !== session.topic) {
                store.updateTargetSession({ id: sessionId }, (sess) => {
                    sess.topic = generatedTitle; // Update local topic
                    console.log(`[Title Generation Action] Updated local topic to: "${generatedTitle}"`);
                });

                // Update server state if conversation exists
                console.log(`[Title Generation Action] Attempting to update server title for ConvID: ${session.id}`);
                const updateReq: ConversationUpdateRequest = { title: generatedTitle };
                updateConversation(session.id, updateReq);
            } else {
                 console.log(`[Title Generation Action] Generated title is default or unchanged, not updating.`);
            }

        } catch (error) {
            console.error(`[Title Generation Action] LLM API call failed:`, error);
            // Optionally notify the user
        }

    }, [apiClient, store]);

    const updateConversation = useCallback(async (id: UUID, conversationData: ConversationUpdateRequest) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot update conversation.");
            return;
        }

        const session = useChatStore.getState().sessions.find(s => s.id === id);
        if (!session) {
            console.warn(`[ChatActions] Session not found: ${id}`);
            return;
        }

        try {
            const updatedConv = await ChatApiService.updateConversation(apiClient, session.id, conversationData);
            console.log(`[ChatActions] Server title updated successfully to: "${updatedConv.title}"`);
            store.updateTargetSession({ id: id }, (sess) => {
                sess.topic = updatedConv.title || sess.topic;
                sess.lastUpdate = new Date(updatedConv.updated_at).getTime();
            });
        } catch (error) {
            console.error(`[ChatActions] Failed to update server title for ConvID ${id}:`, error);
        }
    }, [apiClient, store]);

    // const onUserInput = useCallback(async (
    //     sessionId: UUID,
    //     modelConfig: ModelConfig,
    //     content: string,
    //     attachImages?: string[],
    //     callbacks?: {
    //         onStart?: (messageId: UUID) => void;
    //         onStreaming?: (messageId: UUID, partialMessage: string) => void;
    //         onSuccess?: (messageId: UUID, finalMessage: string, timestamp: Date) => void;
    //         onFailure?: (error: Error) => void;
    //         onController?: (controller: AbortController) => void;
    //     }
    // ) => {
    //     if (!apiClient) {
    //         const error = new Error("[ChatActions] API Client not available.");
    //         console.error(error.message);
    //         callbacks?.onFailure?.(error);
    //         // TODO: Maybe show an error to the user?
    //         return;
    //     }

    //     // Prepare message content (apply template, handle images)
    //     // TODO: Proper multimodal content handling for userContent. For now, it's string.
    //     let userContent: string = fillTemplateWith(content, modelConfig);
    //     // if (attachImages && attachImages.length > 0) {
    //     // This part needs to be adjusted if userContent is to become MultimodalContent[]
    //     // For now, assuming userContent remains string as per original structure before this refactor.
    //     // If attachImages is used, userContent definition and handling (incl. addUserMessage) must change.
    //     // }

    //     // Add user message to store
    //     const userMessage = store.addUserMessage(userContent); // Assumes userContent is string
    //     if (!userMessage) {
    //         const error = new Error("[ChatActions] Failed to add user message to store.");
    //         console.error(error.message);
    //         callbacks?.onFailure?.(error);
    //         return;
    //     }
    //     const localUserMessageId = userMessage.id;

    //     // Add bot placeholder message to store
    //     const botMessage = store.addBotMessagePlaceholder(modelConfig.model);
    //     if (!botMessage) {
    //         const error = new Error("[ChatActions] Failed to add bot placeholder message to store.");
    //         console.error(error.message);
    //         // Potentially rollback userMessage addition or mark it as error
    //         callbacks?.onFailure?.(error);
    //         return;
    //     }
    //     const localBotMessageId = botMessage.id;

    //     // --- Signal Start of Asynchronous Operations ---
        

    //     // --- Prepare messages for API --- 
    //     const { systemPrompts, memoryPrompt, contextPrompts } = store.getMemoryContextPrompts(modelConfig);
    //     const historyMessageCount = modelConfig.historyMessageCount ?? 10;
    //     const recentMessages = store.getRecentMessagesForApi(historyMessageCount - 1);

    //     const messagesForApi: RequestMessage[] = [
    //         ...systemPrompts,
    //         ...(memoryPrompt ? [memoryPrompt] : []),
    //         ...contextPrompts,
    //         ...recentMessages,
    //         userMessage // The new user message (content is string here)
    //     ].map(m => ({
    //         role: m.role,
    //         // Ensure m.content is string as RequestMessage expects string | MultimodalContent[]
    //         // and userMessage.content is string based on current addUserMessage.
    //         content: m.content 
    //     }));

    //     // Trigger saving user message (which was added earlier)
    //     // This is fire-and-forget in the original structure.
    //     // If its failure needs to be caught by lifecycleCallbacks.onFailure, it needs to be awaited.
    //     saveMessageToServer(currentSession.id, userMessage);

    //     // --- Call LLM Service --- 
    //     ChatApiService.callLlmChat(apiClient, {
    //         messages: messagesForApi,
    //         config: { ...modelConfig, stream: true },
    //         onUpdate(partialMessage: string) {
    //             store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
    //                 msg.content = partialMessage;
    //                 msg.streaming = true;
    //             });
                
    //             callbacks?.onStreaming?.(partialMessage);
    //         },
    //         onFinish(finalMessage: string, timestamp: Date, response: Response) {
    //             console.log("[ChatActions] LLM stream finished.");
    //             let finalBotMsg: ChatMessage | undefined;
    //             store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
    //                 msg.content = finalMessage;
    //                 msg.streaming = false;
    //                 msg.syncState = MessageSyncState.PENDING_CREATE;
    //                 msg.date = new Date(timestamp);
    //                 msg.isError = false;
    //                 finalBotMsg = { ...msg };
    //             });

    //             if (finalBotMsg) {
    //                 saveMessageToServer(currentSession.id, finalBotMsg);
    //                 store.updateStat(finalBotMsg);
    //             }

    //             const updatedSessionState = useChatStore.getState().sessions.find(s => s.id === currentSession.id);
    //             if (
    //                 updatedSessionState &&
    //                 updatedSessionState.messages.filter(m => !m.isError).length === 2 &&
    //                 updatedSessionState.topic === DEFAULT_TOPIC
    //             ) {
    //                 const userMsgContent = getMessageTextContent(userMessage); // userMessage.content is string
    //                 const assistantMsgContent = finalMessage;
    //                 if (userMsgContent.trim().length > 0 && assistantMsgContent.trim().length > 0) {
    //                     console.log("[ChatActions] Triggering title generation.");
    //                     setTimeout(() => generateSessionTitle(currentSession.id, userMsgContent, assistantMsgContent), 0);
    //                 }
    //             }

    //             ChatControllerPool.remove(currentSession.id, localBotMessageId);
    //             callbacks?.onSuccess?.(finalMessage, timestamp);
    //         },
    //         onError(error: Error) {
    //             console.error("[ChatActions] LLM call failed:", error);
    //             const isAborted = error.message?.includes?.("aborted");
    //             const errorContent = "\n\n" + prettyObject({ error: true, message: error.message });

    //             // Update user message state to error
    //             store.updateMessage(currentSession.id, localUserMessageId, (msg) => {
    //                 msg.isError = !isAborted;
    //                 msg.syncState = MessageSyncState.ERROR;
    //             });

    //             // Update bot message placeholder state to error
    //             store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
    //                 msg.content = (msg.content || "") + errorContent;
    //                 msg.streaming = false;
    //                 msg.isError = !isAborted;
    //                 msg.syncState = MessageSyncState.ERROR;
    //                 msg.date = new Date();
    //             });

    //             ChatControllerPool.remove(currentSession.id, localBotMessageId);
    //             callbacks?.onFailure?.(error);
    //         },
    //         onController(controller: AbortController) {
    //             ChatControllerPool.addController(currentSession.id, localBotMessageId, controller);
    //             callbacks?.onController?.(controller);
    //         }
    //     });

    // }, [apiClient, store, appConfig, saveMessageToServer]);

    return {
        loadSessionsFromServer,
        newSession,
        selectSession,
        loadMessagesForSession,
        deleteSession,
        saveMessageToServer,
        // onUserInput,
        generateSessionTitle,
        updateConversation,
        // ...export other actions
    };
} 