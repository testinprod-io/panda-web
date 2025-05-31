import { useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/chat';
import { ChatApiService, mapApiMessagesToChatMessages, mapApiMessageToChatMessage, mapConversationToSession } from '@/services/api-service';
import { useApiClient } from '@/providers/api-client-provider';
import { ChatMessage, CustomizedPromptsData, MessageSyncState } from '@/types/chat';
import { MessagesLoadState, SessionSyncState, ChatSession } from '@/types/session';
import { ModelConfig, ModelType } from '@/types/constant';
import { useAppConfig } from '@/store/config';
import {
    ConversationCreateRequest,
    MessageCreateRequest,
    GetConversationMessagesParams,
    ConversationUpdateRequest,
    GetConversationsParams,
    Summary as ApiSummary,
    SummaryCreateRequest,
} from '@/client/types';
import { UUID } from "crypto";
import { RequestMessage } from '@/client/api';
import { DEFAULT_TOPIC } from '@/store/chat';
import { getMessageTextContent, trimTopic } from "@/utils/utils";
// import { ModelType } from "@/store/config";
import { EncryptionService } from '@/services/encryption-service';
import { generateSystemPrompt } from '@/types/chat';

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
        const effectiveLimit = options?.limit ?? 20;

        console.log(`[ChatActions] Loading sessions from server... Cursor: ${effectiveCursor}, Limit: ${effectiveLimit}`);
        try {
            const apiParams: GetConversationsParams = { limit: effectiveLimit };
            if (effectiveCursor) {
                apiParams.cursor = effectiveCursor;
            }
            const response = await ChatApiService.fetchConversations(apiClient, apiParams);
            
            console.log(`[ChatActions] Raw API response from fetchConversations: Received ${response.data.length} items. Pagination:`, response.pagination);

            const serverConvos = response.data;
            const pagination = response.pagination;

            const fetchedAppSessions: ChatSession[] = serverConvos.map(serverConv => {
                const session = mapConversationToSession(serverConv);
                session.syncState = SessionSyncState.SYNCED;
                // mapConversationToSession calls createNewSession which sets messagesLoadState to FULL.
                // For a session just loaded from server list, messages are not yet loaded.
                session.messagesLoadState = MessagesLoadState.NONE; 
                return session;
            });
            console.log(`[ChatActions] Mapped ${fetchedAppSessions.length} sessions from server. Has more: ${pagination.has_more}, Limit: ${effectiveLimit}`);
            
            if (fetchedAppSessions.length > 0 || !options?.cursor) { 
                const sessionMap = new Map<UUID, ChatSession>();

                store.sessions.forEach(s => sessionMap.set(s.id, s));
                fetchedAppSessions.forEach(s => sessionMap.set(s.id, s)); // Fetched take precedence

                const finalSessionsArray = Array.from(sessionMap.values());
                finalSessionsArray.sort((a, b) => b.lastUpdate - a.lastUpdate); // Newest first
                
                const currentSession = store.currentSession();
                let newCurrentIndex = -1;
                if (currentSession) {
                    newCurrentIndex = finalSessionsArray.findIndex(s => s.id === currentSession.id);
                }
                if (newCurrentIndex === -1 && finalSessionsArray.length > 0) {
                    newCurrentIndex = 0; // Default to first if current was removed or no current
                }

                store.setSessions(finalSessionsArray, newCurrentIndex);
            }
            
            return {
                sessions: fetchedAppSessions, // Still return the page of sessions just fetched
                nextCursor: pagination.next_cursor,
                hasMore: pagination.has_more,
            };

        } catch (error) {
            console.error("[ChatActions] Failed to load sessions from server:", error);
            return { sessions: [], nextCursor: null, hasMore: false };
        }
    }, [apiClient, store]);

    const newSession = useCallback(async (modelConfig?: ModelConfig, customizedPrompts?: CustomizedPromptsData): Promise<ChatSession | undefined> => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot create new session on server.");
            return undefined;
        }

        console.log("[ChatActions] Creating new session...");
        
        const createRequest: ConversationCreateRequest = { title: EncryptionService.encrypt(DEFAULT_TOPIC) };
        if (customizedPrompts && customizedPrompts.enabled) {
            createRequest.custom_data = { 'customized_prompts': generateSystemPrompt(customizedPrompts) };
        }

        try {
            const newConversation = await ChatApiService.createConversation(apiClient, createRequest);
            const session = mapConversationToSession(newConversation);

            session.syncState = SessionSyncState.SYNCED;
            session.modelConfig = { ...appConfig.modelConfig, ...modelConfig };
            store.addSession(session);
            
            console.log(`[ChatActions] New session ${session.id} created and added to store.`);
            return session;
        } catch (error) {
            console.error("[ChatActions] Failed to create server session:", error);
            return undefined;
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

            const chatMessages = mapApiMessagesToChatMessages(serverApiMessages);
            return Promise.resolve({ messages: chatMessages, pagination });

        } catch (error: any) {
            console.error(`[ChatActions] Failed loading messages for ${id}:`, error);
            return Promise.reject(error);
        }
    }, [apiClient, store]);

    // Select Session - now by ID
    const selectSession = useCallback((sessionId: UUID) => {
        const sessions = store.sessions;
        const indexToSelect = sessions.findIndex(s => s.id === sessionId);

        if (indexToSelect === -1) {
            console.warn(`[ChatActions] Session with ID ${sessionId} not found in store. Cannot select.`);
            return;
        }

        if (indexToSelect < 0 || indexToSelect >= sessions.length) {
            console.warn(`[ChatActions] Invalid session index derived: ${indexToSelect} for ID ${sessionId}`);
            return;
        }

        store.setCurrentSessionIndex(indexToSelect);
    }, [store]);

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

        console.log(`[ChatActions] Deleting session ${indexToDelete} (ID: ${sessionId})`);

        store.removeSession(indexToDelete);

        if (store.currentSessionIndex === indexToDelete) {
            store.setCurrentSessionIndex(-1);
        }

        // Attempt server deletion if applicable
        if (apiClient && sessionToDelete.syncState !== 'pending_create' && sessionToDelete.syncState !== 'local') {
            try {
                await ChatApiService.deleteConversation(apiClient, sessionId); 
                console.log(`[ChatActions] Server session ${sessionId} deleted.`);
            } catch (error) {
                console.error(`[ChatActions] Failed to delete server session ${sessionId}:`, error);
                // Session is already removed locally, logging error for now.
            }
        } else {
           console.log(`[ChatActions] Session ${sessionId} was local-only or pending creation, no server deletion needed.`);
        }
    }, [apiClient, store]);

    const saveMessageToServer = useCallback(async (conversationId: UUID, message: ChatMessage) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot save message.");
            return;
        }

        const localMessageId = message.id;
        if (!localMessageId) {
            console.error("[saveMessageToServer Action] Message missing local ID, cannot save.", message);
            return;
        }

        // Don't re-save synced messages
        if (message.syncState === MessageSyncState.SYNCED) return;

        // const content = getMessageTextContent(message);
        // if (!content) {
        //     console.warn("[saveMessageToServer Action] Message content is empty, skipping save.", message);
        //     return;
        // }

        console.log(`[ChatActions] Saving message ${localMessageId} to conversation ${conversationId}`);
        const createRequest: MessageCreateRequest = {
            message_id: message.id,
            sender_type: message.role,
            content: message.content,
            reasoning_content: message.reasoning,
            reasoning_time: message.reasoningTime ? message.reasoningTime.toString() : undefined,
            files: message.files,
            custom_data: {
                useSearch: message.useSearch,
            },
        };

        try {
            const savedMessage = await ChatApiService.createMessage(apiClient, conversationId, createRequest);
            console.log(`[ChatActions] Message ${localMessageId} saved successfully (Server ID: ${savedMessage.message_id} TS: ${savedMessage.timestamp} ${savedMessage.sender_type})`);
            message.syncState = MessageSyncState.SYNCED;
        } catch (error: any) {
            console.error(`[ChatActions] Failed saving message ${localMessageId}:`, error);
        }
    }, [apiClient, store]);

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
        
        if (session.visibleTopic !== DEFAULT_TOPIC) {
            console.log(`[Title Generation Action] Session already has a title, skipping.`);
            return;
        }

        // Model for Title Generation (adapts original store's getSummarizeModelConfig)
        const modelConfig = session.modelConfig;
        let titleModel = modelConfig.name;

        const titleGenConfig: ModelConfig = {
            ...modelConfig,
            name: titleModel as ModelType,
            temperature: 0.3,
            max_tokens: 100,
        };

        // Prompt construction (adapts original store logic)
        const prompt = `**Prompt**\n\nYou are a chat‑title generator.\n\nInput\nUser: ${userMessageContent}\nAssistant: ${assistantMessageContent}\n\nTask\n1. If the messages revolve around a specific topic, produce a short, informative title (3–6 words, Title Case, no trailing punctuation).\n2. If they are too vague or empty to summarize meaningfully, output exactly:\n   ${DEFAULT_TOPIC}\n\nRules\n- Output **only** the title text (or "${DEFAULT_TOPIC}")—no extra words or quotation marks.\n- Keep the title neutral and descriptive; do not include the words "user" or "assistant".\n`;

        try {
            console.log(`[Title Generation Action] Calling LLM with config:`, titleGenConfig);
            const generatedTitle = await ChatApiService.callLlmGenerateTitle(apiClient, prompt, titleGenConfig);
            const encryptedTitle = EncryptionService.encrypt(generatedTitle);
            console.log(`[Title Generation Action] LLM generated title: "${generatedTitle}"`);

            // Update local state only if the title is new and not the default
            if (generatedTitle !== DEFAULT_TOPIC && generatedTitle !== session.topic) {
                store.updateTargetSession({ id: sessionId }, (sess) => {
                    sess.topic = encryptedTitle; // Update local topic
                    sess.visibleTopic = generatedTitle;
                    console.log(`[Title Generation Action] Updated local topic to: "${generatedTitle}"`);
                });

                // Update server state if conversation exists
                console.log(`[Title Generation Action] Attempting to update server title for ConvID: ${session.id}`);
                const updateReq: ConversationUpdateRequest = { title: encryptedTitle };
                updateConversation(session.id, updateReq);
            } else {
                 console.log(`[Title Generation Action] Generated title is default or unchanged, not updating.`);
            }

        } catch (error) {
            console.error(`[Title Generation Action] LLM API call failed:`, error);
            // Optionally notify the user
        }

    }, [apiClient]);

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
                sess.visibleTopic = EncryptionService.decrypt(updatedConv.title || sess.topic);
                sess.lastUpdate = new Date(updatedConv.updated_at).getTime();
            });
        } catch (error) {
            console.error(`[ChatActions] Failed to update server title for ConvID ${id}:`, error);
        }
    }, [apiClient]);

    const loadSummariesForSession = useCallback(async (sessionId: UUID): Promise<{ summaries: ApiSummary[], lastSummarizedMessageId: UUID | null }> => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot load summaries.");
            return { summaries: [], lastSummarizedMessageId: null };
        }

        console.log(`[ChatActions] Loading summaries for session ${sessionId}...`);
        try {
            const fetchedSummaries = await apiClient.app.getSummaries(sessionId);
            console.log(`[ChatActions] Received ${fetchedSummaries.length} summaries for session ${sessionId}.`);

            const sortedSummaries = [...fetchedSummaries].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            sortedSummaries.forEach(summary => {
                summary.content = EncryptionService.decrypt(summary.content);
            });

            let lastId: UUID | null = null;
            if (sortedSummaries.length > 0) {
                lastId = sortedSummaries[0].end_message_id;
            }
            return { summaries: sortedSummaries, lastSummarizedMessageId: lastId };
        } catch (error) {
            console.error(`[ChatActions] Failed to load summaries for session ${sessionId}:`, error);
            return { summaries: [], lastSummarizedMessageId: null };
        }
    }, [apiClient]);

    const summarizeAndStoreMessages = useCallback(async (sessionId: UUID, messagesToSummarize: ChatMessage[]): Promise<ApiSummary | undefined> => {
        if (!apiClient || !apiClient.llm || !apiClient.app) {
            console.warn("[ChatActions] API client, LLM service, or App service not available, cannot summarize.");
            return undefined;
        }
        if (messagesToSummarize.length === 0) {
            console.warn("[ChatActions] No messages provided to summarize.");
            return undefined;
        }

        const session = useChatStore.getState().sessions.find(s => s.id === sessionId);
        if (!session) {
            console.warn(`[ChatActions] Session not found: ${sessionId}`);
            return undefined;
        }

        const modelConfig = session.modelConfig;

        // isSummarizing flag management is now responsibility of the caller (useChatSessionManager)
        console.log(`[ChatActions] summarizeAndStoreMessages: Starting for session ${sessionId} with ${messagesToSummarize.length} messages.`);

        try {
            const apiMessages: RequestMessage[] = messagesToSummarize
            
            const summaryText = await ChatApiService.callLlmSummarize(apiClient,  apiMessages, modelConfig);

            if (!summaryText || summaryText.trim().length === 0) {
                console.warn("[ChatActions] LLM returned empty summary. Skipping storage.");
                return undefined;
            }

            console.log(`[ChatActions] LLM summary received. Length: ${summaryText.length}`);

            const startMessageId = messagesToSummarize[0].id;
            const endMessageId = messagesToSummarize[messagesToSummarize.length - 1].id;

            const summaryCreateRequest: SummaryCreateRequest = {
                start_message_id: startMessageId,
                end_message_id: endMessageId,
                content: EncryptionService.encrypt(summaryText),
            };
            const appSummaryResponse = await apiClient.app.createSummary(sessionId, summaryCreateRequest);
            const newSummary = appSummaryResponse.data; 
            newSummary.content = EncryptionService.decrypt(newSummary.content);
            
            console.log(`[ChatActions] Summary stored on server. Summary ID: ${newSummary.summary_id}`);
            return newSummary;

        } catch (error) {
            console.error(`[ChatActions] Failed to summarize and store messages for session ${sessionId}:`, error);
            return undefined;
        } finally {
            // No longer manages isSummarizing flag for the global store here
            console.log(`[ChatActions] summarizeAndStoreMessages: Process finished for session ${sessionId}.`);
        }
    }, [apiClient]);

    // Memoize the returned object of actions
    const actions = useMemo(() => ({
        loadSessionsFromServer,
        newSession,
        selectSession,
        loadMessagesForSession,
        loadSummariesForSession,
        summarizeAndStoreMessages, 
        deleteSession,
        saveMessageToServer,
        generateSessionTitle,
        updateConversation,
    }), [
        loadSessionsFromServer,
        newSession,
        selectSession,
        loadMessagesForSession,
        loadSummariesForSession,
        summarizeAndStoreMessages, 
        deleteSession,
        saveMessageToServer,
        generateSessionTitle,
        updateConversation
    ]);

    return actions;
} 
