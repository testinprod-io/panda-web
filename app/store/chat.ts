import {
  getMessageTextContent,
  safeLocalStorage,
  trimTopic,
} from "@/app/utils";

import { indexedDBStorage } from "@/app/utils/indexedDB-storage";
import { nanoid } from "nanoid";
import type {
  ClientApi,
  MultimodalContent,
  RequestMessage,
} from "@/app/client/api";
import {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  GetConversationMessagesParams,
  Message as ApiMessage,
  MessageCreateRequest,
  PaginatedConversationsResponse,
  PaginatedMessagesResponse,
  HTTPValidationError,
  SenderTypeEnum,
} from "@/app/client/types";
import { UUID } from "crypto";
import { ChatControllerPool } from "@/app/client/controller";
// import { showToast } from "../components/ui-lib";
import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_TEMPLATE,
  KnowledgeCutOffDate,
  ServiceProvider,
  StoreKey,
  SUMMARIZE_MODEL,
  DEFAULT_OPENAI_MODEL_NAME,
  DEFAULT_PANDA_MODEL_NAME,
} from "../constant";
import Locale, { getLang } from "../locales";
import { prettyObject } from "../utils/format";
import { createPersistStore } from "../utils/store";
import { estimateTokenLength } from "../utils/token";
import { ModelConfig, ModelType, useAppConfig } from "./config";
import { useAccessStore } from "./access";
import { collectModelsWithDefaultModel } from "../utils/model";

import { ChatMessage, createMessage, MessageRole, MessageSyncState } from "@/app/types/chat";
import { ChatSession, createEmptySession, SessionSyncState, MessagesLoadState } from "@/app/types/session";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useApiClient } from "../context/ApiProviderContext";

const localStorage = safeLocalStorage();

export const DEFAULT_TOPIC = "New Chat";
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

function mapConversationToSession(conversation: Conversation): ChatSession {
  const session = createEmptySession();
  session.conversationId = conversation.conversation_id;
  session.topic = conversation.title || DEFAULT_TOPIC;
  session.lastUpdate = new Date(conversation.updated_at).getTime();
  session.messages = [BOT_HELLO];
  return session;
}

function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage {
  const role: MessageRole = message.sender_type === SenderTypeEnum.USER ? "user" : "assistant";

  return createMessage({
    id: message.message_id,
    role: role,
    content: message.content,
    date: new Date(message.timestamp).toLocaleString(),
  });
}

function mapRoleToSenderType(role: MessageRole): SenderTypeEnum {
    return role === "user" ? SenderTypeEnum.USER : SenderTypeEnum.SYSTEM;
}

function getSummarizeModel(
  currentModel: string,
  providerName: string,
): string[] {
  if (currentModel.startsWith("gpt") || currentModel.startsWith("chatgpt")) {
    const configStore = useAppConfig.getState();
    const accessStore = useAccessStore.getState();
    const allModel = collectModelsWithDefaultModel(
      configStore.models,
      [configStore.customModels, accessStore.customModels].join(","),
      accessStore.defaultModel,
    );
    const summarizeModel = allModel.find(
      (m) => m.name === SUMMARIZE_MODEL && m.available,
    );
    if (summarizeModel) {
      return [
        summarizeModel.name,
        summarizeModel.provider?.providerName as string,
      ];
    }
  }
  return [currentModel, providerName];
}

function countMessages(msgs: ChatMessage[]): number {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0,
  );
}

function fillTemplateWith(input: string, modelConfig: ModelConfig): string {
  const cutoff =
    KnowledgeCutOffDate[modelConfig.model] ?? KnowledgeCutOffDate.default;
  const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.model);
  let serviceProvider = "OpenAI";
  if (modelInfo) {
    serviceProvider = modelInfo.provider.providerName;
  }
  const vars = {
    ServiceProvider: serviceProvider,
    cutoff,
    model: modelConfig.model,
    time: new Date().toString(),
    lang: getLang(),
    input: input,
  };
  let output = modelConfig.template ?? DEFAULT_INPUT_TEMPLATE;
  if (input.startsWith(output)) {
    output = "";
  }
  const inputVar = "{{input}}";
  if (!output.includes(inputVar)) {
    output += "\n" + inputVar;
  }
  Object.entries(vars).forEach(([name, value]) => {
    const regex = new RegExp(`{{${name}}}`, "g");
    output = output.replace(regex, String(value));
  });
  return output;
}

const DEFAULT_CHAT_STATE = {
  sessions: [createEmptySession()],
  currentSessionIndex: 0,
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

    function mergeSessions(localSessions: ChatSession[], serverConvos: Conversation[]): ChatSession[] {
        const serverConvoMap = new Map(serverConvos.map(c => [c.conversation_id, c]));
        const mergedSessions: ChatSession[] = [];
        const usedServerIds = new Set<UUID>();

        localSessions.forEach(localSession => {
            const serverId = localSession.conversationId;
            if (serverId && serverConvoMap.has(serverId)) {
                const serverConvo = serverConvoMap.get(serverId)!;
                mergedSessions.push({
                    ...localSession,
                    topic: serverConvo.title || localSession.topic,
                    lastUpdate: Math.max(localSession.lastUpdate, new Date(serverConvo.updated_at).getTime()),
                    syncState: 'synced',
                });
                usedServerIds.add(serverId);
            } else if (!serverId && localSession.syncState === 'pending_create') {
                mergedSessions.push(localSession);
            } else {
                 console.warn(`[Merge] Keeping local session ${localSession.id} (ConvID: ${serverId}) with state ${localSession.syncState}.`);
                 mergedSessions.push(localSession);
            }
        });

        serverConvoMap.forEach((serverConvo, serverId) => {
            if (!usedServerIds.has(serverId)) {
                const newLocalSession = mapConversationToSession(serverConvo);
                newLocalSession.syncState = 'synced';
                newLocalSession.messagesLoadState = 'none';
                mergedSessions.push(newLocalSession);
            }
        });

         if (mergedSessions.length === 0) {
             mergedSessions.push(createEmptySession());
         }

        mergedSessions.sort((a, b) => b.lastUpdate - a.lastUpdate);

        return mergedSessions;
    }

    function mergeMessages(localMessages: ChatMessage[], serverMessages: ChatMessage[]): ChatMessage[] {
        const messageMap = new Map<string, ChatMessage>();

        localMessages.forEach(msg => {
            messageMap.set(msg.id, msg);
        });

        serverMessages.forEach(msg => {
            const existing = messageMap.get(msg.id);
            if (!existing || existing.syncState !== 'synced') {
                 messageMap.set(msg.id, { ...msg, syncState: 'synced' });
            }
        });

        const merged = Array.from(messageMap.values());
        merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return merged;
    }

    const methods = {
      forkSession: function() {
        const currentSession = get().currentSession();
        if (!currentSession) return;
        const newSession = createEmptySession();
        newSession.topic = currentSession.topic;
        newSession.messages = currentSession.messages.map((msg: any) => ({ ...msg, id: nanoid() }));
        newSession.modelConfig = currentSession.modelConfig;
        set((state: any) => ({
            sessions: [newSession, ...state.sessions],
            currentSessionIndex: 0,
        }));
      },
      clearSessions() {
        set({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        });
      },
      selectSession(index: number, api: ClientApi | null) {
        set({ currentSessionIndex: index });
        const session = get().sessions[index];
        // const api = getcli

        console.log(`[ChatStore] Triggering message load for selected session ${session.conversationId} api: ${api} session: ${session} session.conversationId: ${session.conversationId} session.messagesLoadState: ${session.messagesLoadState}`);

        if (api && session && session.conversationId && session.messagesLoadState === 'none') {
           console.log(`[ChatStore] Triggered message load for selected session ${session.conversationId}`);
           get().loadMessagesForSession(session.conversationId, api);
        }
      },
      moveSession(from: number, to: number) {
        set(state => {
          const { sessions, currentSessionIndex: oldIndex } = state;
          const newSessions = [...sessions];
          const session = newSessions[from];
          newSessions.splice(from, 1);
          newSessions.splice(to, 0, session);
          let newIndex = oldIndex === from ? to : oldIndex;
          if (oldIndex > from && oldIndex <= to) {
            newIndex -= 1;
          } else if (oldIndex < from && oldIndex >= to) {
            newIndex += 1;
          }
          return {
            sessions: newSessions,
            currentSessionIndex: newIndex,
          };
        });
      },
      newSession(api: ClientApi, modelConfig?: ModelConfig) {
        console.log("[ChatStore] Creating new session locally...");
        const session = createEmptySession();
        if (modelConfig) {
          const config = useAppConfig.getState();
          session.modelConfig = { ...config.modelConfig, ...modelConfig };
        }
        const localSessionId = session.id;

        set(state => ({
          sessions: [session, ...state.sessions],
          currentSessionIndex: 0,
        }));

        const createRequest: ConversationCreateRequest = { title: session.topic };
        console.log("[ChatStore] Attempting to create session on server...");
        api.app.createConversation(createRequest)
            .then(newConversation => {
                console.log("[ChatStore] Server session created successfully:", newConversation.conversation_id);
                get().updateTargetSession({ id: localSessionId }, (sess: ChatSession) => {
                    sess.conversationId = newConversation.conversation_id;
                    sess.topic = newConversation.title || sess.topic;
                    sess.lastUpdate = new Date(newConversation.updated_at).getTime();
                    sess.syncState = 'synced';
                });
            })
            .catch(error => {
                console.error("[ChatStore] Failed to create server session:", error);
                get().updateTargetSession({ id: localSessionId }, (sess: ChatSession) => {
                    sess.syncState = 'error';
                });
            });
      },
      nextSession(delta: number) {
         const n = get().sessions.length;
         const limit = (x: number) => (x + n) % n;
         const i = get().currentSessionIndex;
         get().selectSession(limit(i + delta), null);
      },
      deleteSession(index: number, api: ClientApi) {
          const sessionToDelete = get().sessions.at(index);
          if (!sessionToDelete) return;
          const conversationId = sessionToDelete.conversationId;
          const localId = sessionToDelete.id;

          console.log(`[ChatStore] Deleting session ${index} (ID: ${localId}, ConvID: ${conversationId})`);

          const deletingLastSession = get().sessions.length === 1;

          const sessions = get().sessions.slice();
          sessions.splice(index, 1);

          const currentIndex = get().currentSessionIndex;
          let nextIndex = Math.min(
            currentIndex - Number(index < currentIndex),
            sessions.length - 1,
          );

          if (deletingLastSession) {
            nextIndex = 0;
            sessions.push(createEmptySession());
          }
          set({ sessions, currentSessionIndex: nextIndex });

          if (conversationId && sessionToDelete.syncState !== 'pending_create') {
              api.app.deleteConversation(conversationId)
                  .then(() => {
                      console.log(`[ChatStore] Server session ${conversationId} deleted.`);
                  })
                  .catch(error => {
                      console.error(`[ChatStore] Failed to delete server session ${conversationId}:`, error);
                  });
          } else {
             console.log(`[ChatStore] Session ${localId} was local-only or pending creation, no server deletion needed.`);
          }
      },
      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;
        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set({ currentSessionIndex: index });
        }
        return sessions.at(index);
      },
      onNewMessage(message: ChatMessage, targetSession: ChatSession, api: ClientApi) {
        get().updateTargetSession(targetSession, (session: ChatSession) => {
            session.lastUpdate = Date.now();
          });
          get().updateStat(message, targetSession);
          const updatedSession = get().sessions.find(s => s.id === targetSession.id || (s.conversationId && s.conversationId === targetSession.conversationId));
          if (updatedSession) {
            get().summarizeSession(false, updatedSession, api);
          }
      },
      async onUserInput(content: string, api: ClientApi, attachImages?: string[], isMcpResponse?: boolean) {
        const currentSession = get().currentSession();
        if (!currentSession) {
            console.error("[ChatStore] No current session found for user input.");
            return;
        }
        if (!currentSession.conversationId) {
             console.warn(`[ChatStore] Cannot send message: Session ${currentSession.id} has no conversationId (state: ${currentSession.syncState}). Message not sent.`);
             return;
        }

        const conversationId = currentSession.conversationId;
        const modelConfig = currentSession.modelConfig;

        let mContent: string | MultimodalContent[] = content;
        if (!isMcpResponse) {
          mContent = fillTemplateWith(content, modelConfig);
          if (attachImages && attachImages.length > 0) {
            mContent = [
              ...(content ? [{ type: "text" as const, text: content }] : []),
              ...attachImages.map((url) => ({ type: "image_url" as const, image_url: { url }})),
            ];
          }
        }

        const userMessage: ChatMessage = createMessage({
          role: "user",
          content: mContent as any,
          syncState: 'pending_create',
        });
        const localUserMessageId = userMessage.id;

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
          syncState: 'pending_create',
        });
        const localBotMessageId = botMessage.id;

        const recentMessages = await get().getMessagesWithMemory();
        const sendMessages = recentMessages.concat(userMessage);
        const messageIndex = currentSession.messages.length + 1;

        get().updateTargetSession(currentSession, (sessionState: ChatSession) => {
          sessionState.messages = [...sessionState.messages, userMessage, botMessage];
        });

        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message: string) {
            get().updateTargetSession(currentSession, (sessionState: ChatSession) => {
              const botMsgIndex = sessionState.messages.findIndex(m => m.id === localBotMessageId);
              if (botMsgIndex !== -1) {
                sessionState.messages = sessionState.messages.map((m, i) => i === botMsgIndex ? { ...m, content: message, streaming: true } : m);
              }
            });
          },
          async onFinish(message: string) {
            let finalBotMessage: ChatMessage | undefined;
            let finalUserMessage: ChatMessage | undefined;

            get().updateTargetSession(currentSession, (sessionState: ChatSession) => {
              const botMsgIndex = sessionState.messages.findIndex(m => m.id === localBotMessageId);
              const userMsgIndex = sessionState.messages.findIndex(m => m.id === localUserMessageId);

              if (userMsgIndex !== -1) {
                 finalUserMessage = { ...sessionState.messages[userMsgIndex] };
              }
              if (botMsgIndex !== -1) {
                finalBotMessage = { ...sessionState.messages[botMsgIndex], content: message, streaming: false, date: new Date().toLocaleString(), syncState: 'pending_create' };
                sessionState.messages = sessionState.messages.map((m, i) => i === botMsgIndex ? finalBotMessage! : m);
                get().onNewMessage(finalBotMessage!, sessionState, api);
              }
            });

            if (conversationId && finalUserMessage && finalBotMessage) {
                console.log(`[ChatStore] Triggering server save for user msg ${finalUserMessage.id} and bot msg ${finalBotMessage.id}`);
                get().saveMessageToServer(conversationId, finalUserMessage, api);
                get().saveMessageToServer(conversationId, finalBotMessage, api);
            }

            if (currentSession.messages.length === 2 && currentSession.topic === DEFAULT_TOPIC && finalUserMessage && finalBotMessage) {
               const userMsgContent = getMessageTextContent(finalUserMessage);
               const assistantMsgContent = getMessageTextContent(finalBotMessage);
               if (userMsgContent.trim().length > 0 && assistantMsgContent.trim().length > 0) {
                  setTimeout(() => { get().generateSessionTitle(currentSession.id, userMsgContent, assistantMsgContent, api); }, 0);
               }
            }
            ChatControllerPool.remove(currentSession.id, localBotMessageId);
          },
          onError(error: Error) {
            get().updateTargetSession(currentSession, (sessionState: ChatSession) => {
                const userMsgIndex = sessionState.messages.findIndex(m => m.id === localUserMessageId);
                const botMsgIndex = sessionState.messages.findIndex(m => m.id === localBotMessageId);
                const isAborted = error.message?.includes?.("aborted");
                const errorContent = "\n\n" + prettyObject({ error: true, message: error.message });

                sessionState.messages = sessionState.messages.map((m, index) => {
                    if (index === userMsgIndex) return { ...m, isError: !isAborted, syncState: 'error' };
                    if (index === botMsgIndex) return { ...m, content: (m.content || "") + errorContent, streaming: false, isError: !isAborted, syncState: 'error' };
                    return m;
                });
             });
             ChatControllerPool.remove(currentSession.id, localBotMessageId ?? messageIndex);
             console.error("[Chat] LLM call failed ", error);
          },
          onController(controller: any) {
             ChatControllerPool.addController(currentSession.id, localBotMessageId ?? messageIndex, controller);
          }
        });
      },
      getMemoryPrompt() {
        const session = get().currentSession();
        if (session?.memoryPrompt?.length) {
          return { role: "system", content: Locale.Store.Prompt.History(session.memoryPrompt), date: "" } as ChatMessage;
        }
        return undefined;
      },
      async getMessagesWithMemory() {
        const session = get().currentSession();
        if (!session) return [];
        const modelConfig = session.modelConfig;
        const clearContextIndex = session.clearContextIndex ?? 0;
        const messages = session.messages.slice();
        const totalMessageCount = session.messages.length;
        const systemPrompts = get().getSystemPrompts(modelConfig);
        const { longTermMemoryPrompts, memoryStartIndex } = get().getMemoryPrompts(session, modelConfig, clearContextIndex);
        const contextPrompts = session.context.slice();
        const shortTermMemoryStartIndex = Math.max(0, totalMessageCount - modelConfig.historyMessageCount);
        const contextStartIndex = Math.max(clearContextIndex, memoryStartIndex);
        const maxTokenThreshold = modelConfig.max_tokens;
        const recentMessages = get().getRecentMessages(messages, totalMessageCount, contextStartIndex, maxTokenThreshold);
        return [ ...systemPrompts, ...longTermMemoryPrompts, ...contextPrompts, ...recentMessages ];
      },
      
       getSystemPrompts(modelConfig: ModelConfig): ChatMessage[] {
          const systemPrompts: ChatMessage[] = [];
          systemPrompts.push(createMessage({ role: "system", content: fillTemplateWith("", { ...modelConfig, template: DEFAULT_SYSTEM_TEMPLATE }) }));
          console.log("[Global System Prompt] ", systemPrompts.at(0)?.content ?? "empty");
          return systemPrompts;
       },
       getMemoryPrompts(session: ChatSession, modelConfig: ModelConfig, clearContextIndex: number): { longTermMemoryPrompts: ChatMessage[]; memoryStartIndex: number; } {
          const memoryPrompt = get().getMemoryPrompt();
          const shouldSendLongTermMemory = modelConfig.sendMemory && session.memoryPrompt?.length > 0 && session.lastSummarizeIndex > clearContextIndex;
          const longTermMemoryPrompts = shouldSendLongTermMemory && memoryPrompt ? [memoryPrompt] : [];
          const longTermMemoryStartIndex = session.lastSummarizeIndex;
          const shortTermMemoryStartIndex = Math.max(0, session.messages.length - modelConfig.historyMessageCount);
          const memoryStartIndex = shouldSendLongTermMemory ? Math.min(longTermMemoryStartIndex, shortTermMemoryStartIndex) : shortTermMemoryStartIndex;
          return { longTermMemoryPrompts, memoryStartIndex };
       },
       getRecentMessages(messages: ChatMessage[], totalMessageCount: number, contextStartIndex: number, maxTokenThreshold: number): ChatMessage[] {
          const reversedRecentMessages: ChatMessage[] = [];
          for (let i = totalMessageCount - 1, tokenCount = 0; i >= contextStartIndex && tokenCount < maxTokenThreshold; i -= 1) {
            const msg = messages[i];
            if (!msg || msg.isError) continue;
            tokenCount += estimateTokenLength(getMessageTextContent(msg));
            reversedRecentMessages.push(msg);
          }
          return reversedRecentMessages.reverse();
       },
       resetSession(targetSession: ChatSession) {
        get().updateTargetSession(targetSession, (session) => { session.messages = []; session.memoryPrompt = ""; });
       },
       summarizeSession(refreshTitle: boolean = false, targetSession: ChatSession, api: ClientApi) {
            const config = useAppConfig.getState();
            const session = targetSession;
            const modelConfig = session.modelConfig;
            const [model, providerName] = get().getSummarizeModelConfig(modelConfig);
            get().summarizeMessagesIfNeeded(session, api, modelConfig, model, providerName);
       },
       getSummarizeModelConfig(modelConfig: ModelConfig): [string, string] {
           const result = modelConfig.compressModel ? [modelConfig.compressModel, modelConfig.compressProviderName] : getSummarizeModel(modelConfig.model, modelConfig.providerName);
           return [result[0], result[1]];
       },
       summarizeTopicIfNeeded(session: ChatSession, api: ClientApi, modelConfig: ModelConfig, model: string, providerName: string, refreshTitle: boolean, config: ReturnType<typeof useAppConfig.getState>) {
          const messages = session.messages;
          const SUMMARIZE_MIN_LEN = 50;
          if ((config.enableAutoGenerateTitle && session.topic === DEFAULT_TOPIC && countMessages(messages) >= SUMMARIZE_MIN_LEN) || refreshTitle) {
            const startIndex = Math.max(0, messages.length - modelConfig.historyMessageCount);
            const topicMessages = messages.slice(startIndex < messages.length ? startIndex : messages.length - 1).concat( createMessage({ role: "user", content: Locale.Store.Prompt.Topic }) );
            api.llm.chat({
              messages: topicMessages,
              config: { model, stream: false, providerName },
              onFinish(message: string, responseRes: { status: number }) {
                if (responseRes?.status === 200) {
                    const newTopic = message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC;
                    get().updateTargetSession(session, (sess) => sess.topic = newTopic);
                    if (session.conversationId && newTopic !== session.topic) {
                         const updateReq: ConversationUpdateRequest = { title: newTopic };
                         api.app.updateConversation(session.conversationId, updateReq)
                           .then(updatedConv => {
                                console.log(`[ChatStore] Server session topic updated for ${session.conversationId} to "${updatedConv.title}"`);
                                get().updateTargetSession(session, (sess) => {
                                    sess.topic = updatedConv.title || sess.topic;
                                    sess.lastUpdate = new Date(updatedConv.updated_at).getTime();
                                });
                           })
                           .catch(error => console.error(`[ChatStore] Failed to update server session topic for ${session.conversationId}:`, error));
                    }
                }
              },
            });
          }
       },
       summarizeMessagesIfNeeded(session: ChatSession, api: ClientApi, modelConfig: ModelConfig, model: string, providerName: string) {
          const messages = session.messages;
          const summarizeIndex = Math.max(session.lastSummarizeIndex, session.clearContextIndex ?? 0);
          let toBeSummarizedMsgs = messages.filter((msg) => !msg.isError).slice(summarizeIndex);
          const historyMsgLength = countMessages(toBeSummarizedMsgs);
          if (historyMsgLength > (modelConfig?.max_tokens || 4000)) {
            const n = toBeSummarizedMsgs.length;
            toBeSummarizedMsgs = toBeSummarizedMsgs.slice(Math.max(0, n - modelConfig.historyMessageCount));
          }
          const memoryPrompt = get().getMemoryPrompt();
          if (memoryPrompt) { toBeSummarizedMsgs.unshift(memoryPrompt); }
          const lastSummarizeIndex = session.messages.length;
          if (historyMsgLength > modelConfig.compressMessageLengthThreshold && modelConfig.sendMemory) {
             get().performSummarization(session, api, toBeSummarizedMsgs, modelConfig, model, providerName, lastSummarizeIndex);
          }
       },
       performSummarization(session: ChatSession, api: ClientApi, toBeSummarizedMsgs: ChatMessage[], modelConfig: ModelConfig, model: string, providerName: string, lastSummarizeIndex: number) {
          const { max_tokens, ...modelcfg } = modelConfig;
          api.llm.chat({
            messages: toBeSummarizedMsgs.concat(createMessage({ role: "system", content: Locale.Store.Prompt.Summarize, date: "" })),
            config: { ...modelcfg, stream: true, model, providerName },
            onUpdate(message) { get().updateTargetSession(session, sess => { sess.memoryPrompt = message; }); },
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) { get().updateTargetSession(session, sess => { sess.lastSummarizeIndex = lastSummarizeIndex; sess.memoryPrompt = message; }); }
            },
            onError(err) { console.error("[Summarize] ", err); },
          });
       },
      updateStat(message: ChatMessage, targetSession: ChatSession) {
          get().updateTargetSession(targetSession, (session) => {
            const content = getMessageTextContent(message);
            const wordCount = content.split(/\s+/).filter(Boolean).length;
            const tokenCount = estimateTokenLength(content);
            session.stat = {
                ...session.stat,
                charCount: (session.stat?.charCount || 0) + content.length,
                wordCount: (session.stat?.wordCount || 0) + wordCount,
                tokenCount: (session.stat?.tokenCount || 0) + tokenCount,
            };
          });
      },
      updateTargetSession(targetSession: Partial<ChatSession> & { id?: string; conversationId?: UUID }, updater: (session: ChatSession) => void) {
          set(state => {
             let index = -1;
             if (targetSession.id) {
                 index = state.sessions.findIndex(s => s.id === targetSession.id);
             }
             if (index === -1 && targetSession.conversationId) {
                 index = state.sessions.findIndex(s => s.conversationId === targetSession.conversationId);
             }

             if (index === -1) {
                 console.warn(`[updateTargetSession] Session not found for`, targetSession);
                 return state;
             }

             const newSessions = [...state.sessions];
             const sessionToUpdate = { ...newSessions[index] };
             updater(sessionToUpdate);
             newSessions[index] = sessionToUpdate;
             return { ...state, sessions: newSessions };
          });
      },

      clearCurrentStateToDefault() {
        console.log("[ChatStore] Clearing in-memory state to default.");
        set(DEFAULT_CHAT_STATE);
      },
      async clearAllData() {
        console.warn("[ChatStore] Clearing ALL chat data (in-memory and persisted)");
        await get().clearCurrentStateToDefault();
        location.reload();
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
        console.log("[Update Current Session Model] ", model, providerName);
        if (!session) return;

        get().updateTargetSession(session, (sess) => {
          sess.modelConfig = {
            ...sess.modelConfig,
            model: model,
            providerName: providerName,
          };
        });
      },

      async generateSessionTitle(sessionId: string, userMessageContent: string, assistantMessageContent: string, api: ClientApi) {
          console.log(`[Title Generation] Starting for session: ${sessionId}`);
          const prompt = `**Prompt**

You are a chat‑title generator.

Input
User: ${userMessageContent}
Assistant: ${assistantMessageContent}

Task
1. If the messages revolve around a specific topic, produce a short, informative title (3–6 words, Title Case, no trailing punctuation).
2. If they are too vague or empty to summarize meaningfully, output exactly:
   New Chat

Rules
- Output **only** the title text (or "New Chat")—no extra words or quotation marks.
- Keep the title neutral and descriptive; do not include the words "user" or "assistant".
`;

          try {
              const session = get().sessions.find(s => s.id === sessionId);
              if (!session) {
                  console.warn(`[Title Generation] Session not found: ${sessionId}.`);
                  return;
              }
              const [titleModel, titleProvider] = get().getSummarizeModelConfig(session.modelConfig);
              const titleModelConfig = {
                  ...session.modelConfig,
                  model: titleModel as ModelType,
                  providerName: titleProvider,
                  stream: false,
                  temperature: 0.3,
                  max_tokens: 1000,
              };

              api.llm.chat({
                  messages: [createMessage({ role: "user", content: prompt })],
                  config: titleModelConfig,
                  onFinish(title) {
                      const cleanedTitle = title && title.length > 0 ? trimTopic(title) : DEFAULT_TOPIC;
                      if (cleanedTitle !== DEFAULT_TOPIC) {
                          get().updateTargetSession({ id: sessionId }, (sess) => {
                              if (sess.topic === DEFAULT_TOPIC) {
                                  sess.topic = cleanedTitle;
                                  console.log(`[Title Generation] Updated local topic: "${sess.topic}"`);
                                  if (sess.conversationId) {
                                      const updateReq: ConversationUpdateRequest = { title: cleanedTitle };
                                      api.app.updateConversation(sess.conversationId, updateReq)
                                          .then(updatedConv => {
                                              console.log(`[ChatStore] Server topic updated: "${updatedConv.title}"`);
                                              get().updateTargetSession({ id: sessionId }, s => {
                                                  s.topic = updatedConv.title || s.topic;
                                                  s.lastUpdate = new Date(updatedConv.updated_at).getTime();
                                              });
                                          })
                                          .catch(error => console.error(`Failed server topic update:`, error));
                                  }
                              }
                          });
                      }
                  },
                  onError(error) {
                      console.error(`[Title Generation] LLM API failed:`, error);
                  },
              });
          } catch (error) { console.error(`[Title Generation] Error:`, error); }
      },

      async loadSessionsFromServer(api: ClientApi) {
          console.log("[ChatStore] Loading sessions from server...");
          let currentLocalSessions = _get().sessions;
          try {
              const params = { limit: 20 };
              const response = await api.app.getConversations(params);
              const serverConvos = response.data;
              console.log(`[ChatStore] Received ${serverConvos.length} sessions from server.`);

              const mergedSessions = mergeSessions(currentLocalSessions, serverConvos);

              let currentSessionStillExists = false;
              let newCurrentIndex = 0;
              const currentSession = get().currentSession();

              if (currentSession) {
                 const idx = mergedSessions.findIndex(s => s.id === currentSession.id || (s.conversationId && s.conversationId === currentSession.conversationId));
                 if (idx !== -1) {
                     currentSessionStillExists = true;
                     newCurrentIndex = idx;
                 }
              }

              set({
                  sessions: mergedSessions,
                  currentSessionIndex: newCurrentIndex,
              });

              console.log("[ChatStore] Sessions merged and updated.");

          } catch (error: any) {
              console.error("[ChatStore] Failed to load or merge sessions from server:", error);
              if (_get().sessions.length === 0) {
                  set({ sessions: [createEmptySession()], currentSessionIndex: 0 });
              }
          }
      },

      async loadMessagesForSession(conversationId: UUID, api: ClientApi, params?: GetConversationMessagesParams) {
          console.log(`[ChatStore] Loading messages for conversation ${conversationId}`);
          get().updateTargetSession({ conversationId }, (sess: ChatSession) => { sess.messagesLoadState = 'loading'; });

          try {
              const session = get().sessions.find(s => s.conversationId === conversationId);
              const cursor = params?.cursor ?? session?.serverMessagesCursor;
              const loadParams = { ...(params ?? {}), limit: 20, cursor: cursor };

              const response = await api.app.getConversationMessages(conversationId, loadParams);
              const serverApiMessages = response.data;
              console.log(`[ChatStore] Received ${serverApiMessages.length} messages for ${conversationId}. Has more: ${response.pagination.has_more}`);

              const serverMessages = serverApiMessages.map(mapApiMessageToChatMessage);

              get().updateTargetSession({ conversationId }, (sess: ChatSession) => {
                  const localMessages = sess.messages;
                  const mergedMessages = mergeMessages(localMessages, serverMessages);

                  sess.messages = mergedMessages;
                  sess.messagesLoadState = response.pagination.has_more ? 'partial' : 'full';
                  sess.serverMessagesCursor = response.pagination.next_cursor;
              });

          } catch (error: any) {
              console.error(`[ChatStore] Failed loading messages for ${conversationId}:`, error);
              get().updateTargetSession({ conversationId }, (sess: ChatSession) => { sess.messagesLoadState = 'error'; });
          }
      },

      async saveMessageToServer(conversationId: UUID, message: ChatMessage, api: ClientApi) {
        const localMessageId = message.id;
        if (!localMessageId) {
            console.error("[saveMessageToServer] Message missing local ID, cannot save.", message);
            return;
        }

        if (message.syncState === 'synced') return;

        const content = getMessageTextContent(message);
        if (!content) return;

        const messageIdForServer = crypto.randomUUID() as UUID;

        console.log(`[ChatStore] Saving message ${localMessageId} (Client) / ${messageIdForServer} (Server) to conversation ${conversationId}`);
        const createRequest: MessageCreateRequest = {
            message_id: messageIdForServer,
            sender_type: mapRoleToSenderType(message.role),
            content: content
        };

        try {
            const savedMessage = await api.app.createMessage(conversationId, createRequest);
            console.log(`[ChatStore] Message ${localMessageId} saved successfully (Server ID: ${savedMessage.message_id})`);

            get().updateTargetSession({ conversationId }, (sess: ChatSession) => {
                const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
                if (msgIndex !== -1) {
                    sess.messages[msgIndex] = {
                       ...sess.messages[msgIndex],
                       id: savedMessage.message_id,
                       syncState: 'synced',
                       isError: false,
                    };
                     console.log(`[ChatStore] Updated local message ${localMessageId} to server ID ${savedMessage.message_id} and state 'synced'`);
                } else {
                    console.warn(`[ChatStore] Could not find local message ${localMessageId} to update after server save.`);
                }
            });
        } catch (error: any) {
            console.error(`[ChatStore] Failed saving message ${localMessageId}:`, error);
            get().updateTargetSession({ conversationId }, (sess: ChatSession) => {
                const msgIndex = sess.messages.findIndex(m => m.id === localMessageId);
                if (msgIndex !== -1) {
                    sess.messages[msgIndex] = {
                       ...sess.messages[msgIndex],
                       syncState: 'error',
                       isError: true,
                    };
                }
            });
        }
      },

    };

    return { ...methods };
  },
  {
    name: StoreKey.Chat,
    version: 1.0,
    storage: indexedDBStorage as any,
  },
);

export function AuthChatListener() {
  const { ready, authenticated } = usePrivy();
  const clearCurrentStateToDefault = useChatStore((state: any) => state.clearCurrentStateToDefault);
  const loadSessionsFromServer = useChatStore((state: any) => state.loadSessionsFromServer);
  const apiClient = useApiClient();

  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [initialLoadTriggered, setInitialLoadTriggered] = useState(false);

  useEffect(() => {
    if (!ready) return;

    if (isInitialLoad) {
      setPrevAuthState(authenticated);
      setIsInitialLoad(false);
      console.log("[AuthChatListener] Initial auth state:", authenticated);
    }

    if (authenticated && apiClient && !initialLoadTriggered && typeof loadSessionsFromServer === 'function') {
        console.log("[AuthChatListener] Authenticated and ready. Triggering initial session load.");
        loadSessionsFromServer(apiClient);
        setInitialLoadTriggered(true);
    }

    if (!isInitialLoad && authenticated !== prevAuthState) {
      console.log(`[AuthChatListener] Auth state changed: ${prevAuthState} -> ${authenticated}.`);
      setInitialLoadTriggered(false);
      setPrevAuthState(authenticated);

      if (!authenticated) {
          console.log("[AuthChatListener] User logged out. Clearing local chat state.");
          if (typeof clearCurrentStateToDefault === 'function') {
              clearCurrentStateToDefault();
          }
      } else {
          console.log("[AuthChatListener] User is now authenticated.");
          if (apiClient && typeof loadSessionsFromServer === 'function') {
              console.log("[AuthChatListener] Reloading data on re-authentication.");
              loadSessionsFromServer(apiClient);
              setInitialLoadTriggered(true);
          }
      }
    }
  }, [ready, authenticated, prevAuthState, isInitialLoad, loadSessionsFromServer, clearCurrentStateToDefault, initialLoadTriggered, apiClient]);

  return null;
}
