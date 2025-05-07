import { useCallback } from 'react';
import { useChatStore } from '@/app/store/chat';
import { ChatApiService, mapConversationToSession, mapRoleToSenderType} from '@/app/services/ChatApiService';
import { useApiClient } from '@/app/context/ApiProviderContext';
import { ChatMessage, MessageSyncState } from '@/app/types/chat';
import { MessagesLoadState, SessionSyncState } from '@/app/types/session';
import { ModelConfig, useAppConfig } from '@/app/store/config';
import {
    ConversationCreateRequest,
    MessageCreateRequest,
    GetConversationMessagesParams,
    ConversationUpdateRequest
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

    const loadSessionsFromServer = useCallback(async () => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot load sessions.");
            return;
        }
        console.log("[ChatActions] Loading sessions from server...");
        try {
            const params = { limit: 20 }; // Load more sessions
            const response = await ChatApiService.fetchConversations(apiClient, params);
            const serverConvos = response.data;
            console.log(`[ChatActions] Received ${serverConvos.length} sessions from server.`);
            
            // Call the store's internal method to merge and update state
            store._onServerSessionsLoaded(serverConvos);
            console.log("[ChatActions] Sessions merged and updated in store.");

            // After loading sessions, trigger loading messages for the current session if needed
            const currentSession = store.currentSession();
            if (currentSession && currentSession.messagesLoadState === 'none') {
                 console.log(`[ChatActions] Triggering message load for current session ${currentSession.id} after initial session load.`);
                 loadMessagesForSession(currentSession.id); // Call the action
            }

        } catch (error) {
            console.error("[ChatActions] Failed to load sessions from server:", error);
            // Handle error state in UI? For now, just log.
             // Ensure there's at least one session even on error
            // if (store.sessions.length === 0) {
            //      store.addSession(createEmptySession());
            // }
        }
    }, [apiClient, store]);

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

     const loadMessagesForSession = useCallback(async (id: UUID, params?: { cursor?: string, limit?: number }) => {
        if (!apiClient) {
            console.warn("[ChatActions] API client not available, cannot load messages.");
            return;
        }

        const session = store.sessions.find(s => s.id === id);
        if (!session || session.messagesLoadState === 'loading' || session.messagesLoadState === 'full') {
            console.log(`[ChatActions] Skipping message load for ${id}. State: ${session?.messagesLoadState}`);
            return; // Already loading, fully loaded, or session doesn't exist
        }

        console.log(`[ChatActions] Loading messages for conversation ${id}`);
        // Update store state to loading
        store._setMessagesLoadState(id, MessagesLoadState.LOADING);

        // Revert to simpler params construction - service layer handles null cursor
        const loadParams: GetConversationMessagesParams = {
             limit: params?.limit ?? 20,
             cursor: params?.cursor ?? session.serverMessagesCursor, // Pass null/undefined directly
         };

        console.log(`[ChatActions] Effective load params:`, loadParams);

        try {
            // Service layer's fetchMessages will handle null cursor before calling api.app method
            const response = await ChatApiService.fetchMessages(apiClient, id, loadParams);
            const serverApiMessages = response.data;
            const pagination = response.pagination;
            console.log(`[ChatActions] Received ${serverApiMessages.length} messages for ${id}. Has more: ${pagination.has_more}`);

            // Call store's internal method to merge messages and update state
            store._onServerMessagesLoaded(id, serverApiMessages, pagination.has_more, pagination.next_cursor);

        } catch (error: any) {
            console.error(`[ChatActions] Failed loading messages for ${id}:`, error);
            // Update store state to error
            store._setMessagesLoadState(id, MessagesLoadState.ERROR);
            // Optionally show error to user
        }
    }, [apiClient, store]);

    // Select Session - combines store update with triggering message load
    const selectSession = useCallback((index: number) => {
        const sessions = store.sessions;
        if (index < 0 || index >= sessions.length) {
            console.warn(`[ChatActions] Invalid session index selected: ${index}`);
            return;
        }
        const targetSession = sessions[index];

        // Update index in store
        store.setCurrentSessionIndex(index);

        // Trigger message loading if needed
        if (targetSession.id && targetSession.messagesLoadState === 'none') {
            console.log(`[ChatActions] Session ${targetSession.id} selected, triggering message load.`);
            loadMessagesForSession(targetSession.id);
        }
    }, [store, loadMessagesForSession]);

    const deleteSession = useCallback(async (index: number) => {
        if (!apiClient) {
             console.warn("[ChatActions] API client not available, cannot delete server session.");
        }

        const sessionToDelete = store.sessions.at(index);
        if (!sessionToDelete) {
            console.error(`[ChatActions] Attempted to delete non-existent session at index ${index}`);
            return;
        }

        const id = sessionToDelete.id;

        console.log(`[ChatActions] Deleting session ${index} (ID: ${id})`);

        // Remove from store immediately
        store.removeSession(index);

        // Attempt server deletion if applicable
        if (apiClient && sessionToDelete.syncState !== 'pending_create' && sessionToDelete.syncState !== 'local') {
            try {
                await ChatApiService.deleteConversation(apiClient, id);
                console.log(`[ChatActions] Server session ${id} deleted.`);
            } catch (error) {
                console.error(`[ChatActions] Failed to delete server session ${id}:`, error);
                // How to handle? Maybe notify user? Re-add local session?
                // For now, just log error. The session is already removed locally.
            }
        } else {
           console.log(`[ChatActions] Session ${id} was local-only or pending creation, no server deletion needed.`);
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
        const messageIdForServer = crypto.randomUUID() as UUID;

        console.log(`[ChatActions] Saving message ${localMessageId} (Client) / ${messageIdForServer} (Server) to conversation ${conversationId}`);
        const createRequest: MessageCreateRequest = {
            message_id: messageIdForServer,
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

    const onUserInput = useCallback(async (content: string, attachImages?: string[]) => {
        const currentSession = store.currentSession();
        if (!currentSession) {
            console.error("[ChatActions] No current session found for user input.");
            return;
        }
        if (!apiClient) {
             console.error("[ChatActions] API Client not available.");
             // TODO: Maybe show an error to the user?
             return;
        }

        // Ensure session is synced or ready to be created before sending messages
        // This prevents sending messages to a session stuck in an error state after creation failed.
        // if (!currentSession.conversationId && currentSession.syncState !== 'pending_create' && currentSession.syncState !== 'local') {
        //      console.warn(`[ChatActions] Cannot send message: Session ${currentSession.id} has no conversationId and is in state: ${currentSession.syncState}. Message not sent.`);
        //      // TODO: Notify user?
        //      return;
        // }

        // If the session is local/pending_create, create it on the server first.
        // This might introduce slight delay for the first message.
        // let conversationId = currentSession.conversationId;
        // if (!conversationId) {
        //     console.log(`[ChatActions] Session ${currentSession.id} is local, creating on server before sending message...`);
        //     try {
        //         const createRequest: ConversationCreateRequest = { title: currentSession.topic };
        //         const newConversation = await ChatApiService.createConversation(apiClient, createRequest);
        //         conversationId = newConversation.conversation_id;
        //         store.updateTargetSession({ id: currentSession.id }, (sess) => {
        //             sess.conversationId = newConversation.conversation_id;
        //             sess.topic = newConversation.title || sess.topic;
        //             sess.lastUpdate = new Date(newConversation.updated_at).getTime();
        //             sess.syncState = 'synced';
        //         });
        //         console.log(`[ChatActions] Server session ${conversationId} created for local session ${currentSession.id}.`);
        //     } catch (error) {
        //         console.error("[ChatActions] Failed to auto-create server session before sending message:", error);
        //         store.updateTargetSession({ id: currentSession.id }, (sess) => { sess.syncState = 'error'; });
        //         // TODO: Notify user of the failure
        //         return; // Stop if session creation failed
        //     }
        // }

        // Proceed only if we have a valid conversationId now
        // if (!conversationId) {
        //      console.error("[ChatActions] Fatal: Could not obtain conversationId for message sending.");
        //      return;
        // }

        const modelConfig = currentSession.modelConfig;

        // Prepare message content (apply template, handle images)
        let userContent: string = fillTemplateWith(content, modelConfig);
        // if (attachImages && attachImages.length > 0) {
        //     userContent = [
        //         ...(content ? [{ type: "text" as const, text: userContent as string }] : []), // Use templated content if text exists
        //         ...attachImages.map((url) => ({ type: "image_url" as const, image_url: { url }})),
        //     ];
        // }

        // Add user message to store
        const userMessage = store.addUserMessage(userContent);
        if (!userMessage) return; // Should not happen if session exists
        const localUserMessageId = userMessage.id;

        // Add bot placeholder message to store
        const botMessage = store.addBotMessagePlaceholder(modelConfig.model);
        if (!botMessage) return; // Should not happen
        const localBotMessageId = botMessage.id;

        // --- Prepare messages for API --- 
        // 1. Get prompts (System, Memory, Context)
        const { systemPrompts, memoryPrompt, contextPrompts } = store.getMemoryContextPrompts(modelConfig);

        // 2. Get recent messages from store (excluding errors)
        // Need to include the *new* user message we just added
        const historyMessageCount = modelConfig.historyMessageCount ?? 10; // Default history count
        const recentMessages = store.getRecentMessagesForApi(historyMessageCount -1); // Get N-1 messages

        // 3. Combine prompts and messages
        const messagesForApi: RequestMessage[] = [
            ...systemPrompts,
            ...(memoryPrompt ? [memoryPrompt] : []),
            ...contextPrompts,
            ...recentMessages, // Recent N-1 messages
            userMessage // The new user message
        ].map(m => ({ role: m.role, content: m.content })); // Map to RequestMessage format

        // Trigger saving user message (which was added earlier)
        saveMessageToServer(currentSession.id, userMessage);

        // --- Call LLM Service --- 
        ChatApiService.callLlmChat(apiClient, {
            messages: messagesForApi,
            config: { ...modelConfig, stream: true },
            onUpdate(partialMessage: string) {
                // Update the placeholder bot message with streaming content
                store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
                    msg.content = partialMessage;
                    msg.streaming = true;
                });
            },
            onFinish(finalMessage: string, timestamp: Date, response: Response) {
                console.log("[ChatActions] LLM stream finished.");
                // Update final bot message state in store
                let finalBotMsg: ChatMessage | undefined;
                store.updateMessage(currentSession.id, localBotMessageId, async (msg) => {
                    msg.content = finalMessage;
                    msg.streaming = false;
                    msg.syncState = MessageSyncState.PENDING_CREATE; // Mark for saving
                    msg.date = new Date(timestamp);
                    msg.isError = false;
                    finalBotMsg = { ...msg }; // Capture the final state
                });

                // Trigger saving final bot message
                if (finalBotMsg) {
                    saveMessageToServer(currentSession.id, finalBotMsg);
                    // Update session stats with final bot message
                    store.updateStat(finalBotMsg);
                }

                // Trigger title generation if it's the first real exchange
                const updatedSessionState = useChatStore.getState().sessions.find(s => s.id === currentSession.id);
                if (
                    updatedSessionState &&
                    updatedSessionState.messages.filter(m => !m.isError).length === 2 &&
                    updatedSessionState.topic === DEFAULT_TOPIC
                ) {
                    const userMsgContent = getMessageTextContent(userMessage);
                    const assistantMsgContent = finalMessage;
                    if (userMsgContent.trim().length > 0 && assistantMsgContent.trim().length > 0) {
                        console.log("[ChatActions] Triggering title generation.");
                        setTimeout(() => generateSessionTitle(currentSession.id, userMsgContent, assistantMsgContent), 0);
                    }
                }

                ChatControllerPool.remove(currentSession.id, localBotMessageId);
            },
            onError(error: Error) {
                console.error("[ChatActions] LLM call failed:", error);
                const isAborted = error.message?.includes?.("aborted");
                const errorContent = "\n\n" + prettyObject({ error: true, message: error.message });

                // Update user message state to error
                store.updateMessage(currentSession.id, localUserMessageId, (msg) => {
                    msg.isError = !isAborted;
                    msg.syncState = MessageSyncState.ERROR;
                });

                // Update bot message placeholder state to error
                store.updateMessage(currentSession.id, localBotMessageId, (msg) => {
                    msg.content = (msg.content || "") + errorContent;
                    msg.streaming = false;
                    msg.isError = !isAborted;
                    msg.syncState = MessageSyncState.ERROR;
                    msg.date = new Date(); // Final timestamp for error message
                });

                ChatControllerPool.remove(currentSession.id, localBotMessageId);
                // TODO: Notify user?
            },
            onController(controller: AbortController) {
                ChatControllerPool.addController(currentSession.id, localBotMessageId, controller);
            }
        });

    }, [apiClient, store, appConfig, saveMessageToServer]);

    return {
        loadSessionsFromServer,
        newSession,
        selectSession,
        loadMessagesForSession,
        deleteSession,
        saveMessageToServer,
        onUserInput,
        generateSessionTitle,
        updateConversation,
        // ...export other actions
    };
} 