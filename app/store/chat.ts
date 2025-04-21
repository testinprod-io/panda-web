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

import { ChatMessage, createMessage, MessageRole } from "@/app/types/chat";
import { ChatSession, createEmptySession } from "@/app/types/session";
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
      selectSession(index: number) {
        set({ currentSessionIndex: index });
        const session = get().sessions[index];
        const api = (window as any).chatApiClient as ClientApi;
        if (api && session && session.conversationId && session.messages.length <= 1) {
           console.log(`[ChatStore] Triggering message load for selected session ${session.conversationId}`);
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
        console.log("[ChatStore] Creating new session...");
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
        api.app.createConversation(createRequest)
            .then(newConversation => {
                console.log("[ChatStore] Server session created:", newConversation);
                get().updateTargetSession({ id: localSessionId }, (sess) => {
                    sess.conversationId = newConversation.conversation_id;
                    sess.topic = newConversation.title || sess.topic;
                    sess.lastUpdate = new Date(newConversation.updated_at).getTime();
                });
            })
            .catch(error => {
                console.error("[ChatStore] Failed to create server session:", error);
            });
      },
      nextSession(delta: number) {
         const n = get().sessions.length;
         const limit = (x: number) => (x + n) % n;
         const i = get().currentSessionIndex;
         get().selectSession(limit(i + delta));
      },
      deleteSession(index: number, api: ClientApi) {
          const state = _get();
          const sessionToDelete = state.sessions.at(index);
          if (!sessionToDelete) return;

          console.log(`[ChatStore] Deleting session ${index} (ID: ${sessionToDelete.id}, ConvID: ${sessionToDelete.conversationId})`);

          const conversationId = sessionToDelete.conversationId;
          const localSessionId = sessionToDelete.id;

          const deletingLastSession = state.sessions.length === 1;

          const sessions = state.sessions.slice();
          sessions.splice(index, 1);

          const currentIndex = state.currentSessionIndex;
          let nextIndex = Math.min(
            currentIndex - Number(index < currentIndex),
            sessions.length - 1,
          );

          if (deletingLastSession) {
            nextIndex = 0;
            sessions.push(createEmptySession());
          }
          set({ sessions, currentSessionIndex: nextIndex });

          if (conversationId) {
              api.app.deleteConversation(conversationId)
                  .then(() => {
                      console.log(`[ChatStore] Server session ${conversationId} deleted successfully.`);
                  })
                  .catch(error => {
                      console.error(`[ChatStore] Failed to delete server session ${conversationId}:`, error);
                  });
          } else {
              console.log(`[ChatStore] Session ${localSessionId} was local-only, no server deletion needed.`);
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
          get().updateTargetSession(targetSession, (session) => {
            session.messages = session.messages.concat();
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
        if (!currentSession || !currentSession.conversationId) {
          console.error("[ChatStore] Cannot send message: Session or conversationId missing.");
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
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
        });

        const sendMessages = await get().getMessagesWithMemory();
        const messageIndex = currentSession.messages.length + 1;

        get().updateTargetSession(currentSession, (sessionState) => {
          sessionState.messages = [...sessionState.messages, userMessage, botMessage];
        });

        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            get().updateTargetSession(currentSession, (sessionState) => {
              const botMsgIndex = sessionState.messages.findIndex(m => m.id === botMessage.id);
              if (botMsgIndex !== -1) {
                sessionState.messages = sessionState.messages.map((m, i) => i === botMsgIndex ? { ...m, content: message, streaming: true } : m);
              }
            });
          },
          async onFinish(message) {
            let finalBotMessage: ChatMessage | undefined;
            let finalUserMessage: ChatMessage | undefined;

            get().updateTargetSession(currentSession, (sessionState) => {
              const botMsgIndex = sessionState.messages.findIndex(m => m.id === botMessage.id);
              const userMsgIndex = sessionState.messages.findIndex(m => m.id === userMessage.id);

              if (userMsgIndex !== -1) finalUserMessage = sessionState.messages[userMsgIndex];

              if (botMsgIndex !== -1) {
                finalBotMessage = { ...sessionState.messages[botMsgIndex], content: message, streaming: false, date: new Date().toLocaleString() };
                sessionState.messages = sessionState.messages.map((m, i) => i === botMsgIndex ? finalBotMessage! : m);

                get().onNewMessage(finalBotMessage!, sessionState, api);

                if (conversationId && finalUserMessage && finalBotMessage) {
                  get().saveMessageToServer(conversationId, finalUserMessage, api);
                  get().saveMessageToServer(conversationId, finalBotMessage, api);
                }

                if (sessionState.messages.length === 2 && sessionState.topic === DEFAULT_TOPIC && finalUserMessage && finalBotMessage) {
                  const userMsgContent = getMessageTextContent(finalUserMessage);
                  const assistantMsgContent = getMessageTextContent(finalBotMessage);
                  if (userMsgContent.trim().length > 0 && assistantMsgContent.trim().length > 0) {
                     setTimeout(() => { methods.generateSessionTitle(sessionState.id, userMsgContent, assistantMsgContent, api); }, 0);
                  }
                }
              }
            });
            ChatControllerPool.remove(currentSession.id, botMessage.id);
          },
          onError(error) {
             const isAborted = error.message?.includes?.("aborted");
            get().updateTargetSession(currentSession, (sessionState) => {
               const userMsgIndex = sessionState.messages.findIndex(m => m.id === userMessage.id);
               const botMsgIndex = sessionState.messages.findIndex(m => m.id === botMessage.id);
               const newMessages = [...sessionState.messages];
               if (userMsgIndex !== -1) { newMessages[userMsgIndex] = { ...newMessages[userMsgIndex], isError: !isAborted }; }
               if (botMsgIndex !== -1) { newMessages[botMsgIndex] = { ...newMessages[botMsgIndex], content: (newMessages[botMsgIndex].content || "") + "\n\n" + prettyObject({ error: true, message: error.message }), streaming: false, isError: !isAborted }; }
               sessionState.messages = newMessages;
            });
            ChatControllerPool.remove(currentSession.id, botMessage.id ?? messageIndex);
            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            ChatControllerPool.addController(currentSession.id, botMessage.id ?? messageIndex, controller);
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
          try {
              const params = { limit: 100 };
              const response = await api.app.getConversations(params);
              const serverSessions = response.data.map(mapConversationToSession);
              set({
                  sessions: serverSessions.length > 0 ? serverSessions : [createEmptySession()],
                  currentSessionIndex: 0,
              });
          } catch (error) {
              console.error("[ChatStore] Failed to load sessions from server:", error);
              if (get().sessions.length === 0) {
                  set({ sessions: [createEmptySession()], currentSessionIndex: 0 });
              }
          }
      },

      async loadMessagesForSession(conversationId: UUID, api: ClientApi, params?: GetConversationMessagesParams) {
          console.log(`[ChatStore] Loading messages for ${conversationId}`);
          try {
              const loadParams = params || { limit: 50 };
              const response = await api.app.getConversationMessages(conversationId, loadParams);
              const serverMessages = response.data.map(mapApiMessageToChatMessage);
              get().updateTargetSession({ conversationId }, (sess) => {
                   sess.messages = serverMessages;
              });
          } catch (error) {
              console.error(`[ChatStore] Failed loading messages for ${conversationId}:`, error);
          }
      },

      async saveMessageToServer(conversationId: UUID, message: ChatMessage, api: ClientApi) {
        const content = getMessageTextContent(message);
        if (!content || message.streaming || message.isError) return;

        const messageId = crypto.randomUUID() as UUID;

        console.log(`[ChatStore] Saving message ${message.id} (Client) / ${messageId} (Server)`);
        const createRequest: MessageCreateRequest = {
            message_id: messageId,
            sender_type: mapRoleToSenderType(message.role),
            content: content
        };
        try {
            const savedMessage = await api.app.createMessage(conversationId, createRequest);
            console.log(`[ChatStore] Message saved (Server ID: ${savedMessage.message_id})`);
        } catch (error: any) {
            console.error(`[ChatStore] Failed saving message ${message.id}:`, error);
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
  const { ready, authenticated, getAccessToken } = usePrivy();
  const clearCurrentStateToDefault = useChatStore((state: any) => state.clearCurrentStateToDefault);
  const apiClient = useApiClient();
  const loadSessionsFromServer = useChatStore((state: any) => state.loadSessionsFromServer);
  // const [apiClient, setApiClient] = useState<ApiClient | null>(null);
  // const originalApiPlaceholder = { llm: null as any, share: null as any };

  // useEffect(() => {
  //     if (ready && !apiClient) {
  //         const getAuthToken = async () => {
  //             try {
  //                 return await getAccessToken();
  //             } catch (error) {
  //                 console.error("[AuthChatListener] Failed to get access token:", error);
  //                 return null;
  //             }
  //         };
  //         const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
  //         const client = new ApiClient(baseUrl, getAuthToken);
  //         setApiClient(client);
  //         console.log("[AuthChatListener] ApiClient initialized.");
  //     }
  // }, [ready, apiClient, getAccessToken]);

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
        // const clientApi: ClientApi = {
        //      ...originalApiPlaceholder,
        //      chat: apiClient,
        //  };
        loadSessionsFromServer(apiClient);
        setInitialLoadTriggered(true);
    }

    if (!isInitialLoad && authenticated !== prevAuthState) {
      console.log(`[AuthChatListener] Auth state changed from ${prevAuthState} to ${authenticated}. Reloading page.`);
      setInitialLoadTriggered(false);
      if (typeof clearCurrentStateToDefault === 'function') {
          clearCurrentStateToDefault();
      } else {
          console.warn("[AuthChatListener] clearCurrentStateToDefault action not available or not a function yet.");
      }
      window.location.reload();
    }

  }, [ready, authenticated, prevAuthState, isInitialLoad, loadSessionsFromServer, clearCurrentStateToDefault, initialLoadTriggered, apiClient]);

  return null;
}
