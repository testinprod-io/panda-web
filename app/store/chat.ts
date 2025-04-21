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

import { ChatMessage, createMessage } from "@/app/types/chat";
import { ChatSession, createEmptySession } from "@/app/types/session";
import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

const localStorage = safeLocalStorage();

export const DEFAULT_TOPIC = "New Chat";
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

/**
 * Gets the appropriate model for summarization based on the current model
 * @param currentModel - The current model being used
 * @param providerName - The provider name
 * @returns A tuple of [model, providerName]
 */
function getSummarizeModel(
  currentModel: string,
  providerName: string,
): string[] {
  // if it is using gpt-* models, force to use 4o-mini to summarize
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
  // if (currentModel.startsWith("gemini")) {
  //   return [GEMINI_SUMMARIZE_MODEL, ServiceProvider.Google];
  // } else if (currentModel.startsWith("deepseek-")) {
  //   return [DEEPSEEK_SUMMARIZE_MODEL, ServiceProvider.DeepSeek];
  // }

  return [currentModel, providerName];
}

/**
 * Counts the estimated token length of messages
 * @param msgs - Array of chat messages
 * @returns The estimated token count
 */
function countMessages(msgs: ChatMessage[]): number {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0,
  );
}

/**
 * Fills a template with variables
 * @param input - The input text
 * @param modelConfig - The model configuration
 * @returns The filled template
 */
function fillTemplateWith(input: string, modelConfig: ModelConfig): string {
  const cutoff =
    KnowledgeCutOffDate[modelConfig.model] ?? KnowledgeCutOffDate.default;
  // Find the model in the DEFAULT_MODELS array that matches the modelConfig.model
  const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.model);

  let serviceProvider = "OpenAI";
  if (modelInfo) {
    // TODO: auto detect the providerName from the modelConfig.model

    // Directly use the providerName from the modelInfo
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

  // remove duplicate
  if (input.startsWith(output)) {
    output = "";
  }

  // must contains {{input}}
  const inputVar = "{{input}}";
  if (!output.includes(inputVar)) {
    output += "\n" + inputVar;
  }

  Object.entries(vars).forEach(([name, value]) => {
    const regex = new RegExp(`{{${name}}}`, "g");
    output = output.replace(regex, value.toString()); // Ensure value is a string
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
      // --- Keep ALL original methods implementation ---
      forkSession() {
        // Ensure state updates are immutable if not using Immer
        const currentSession = get().currentSession();
        if (!currentSession) return;
        const newSession = createEmptySession();
        newSession.topic = currentSession.topic;
        newSession.messages = currentSession.messages.map((msg) => ({ ...msg, id: nanoid() }));
        newSession.modelConfig = currentSession.modelConfig;
        set(state => ({ // Immutable update
            sessions: [newSession, ...state.sessions],
            currentSessionIndex: 0,
        }));
      },
      clearSessions() {
        set({ // Immutable update
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        });
      },
      selectSession(index: number) {
        set({ currentSessionIndex: index });
      },
      moveSession(from: number, to: number) {
        set(state => { // Immutable update
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
      newSession(modelConfig?: ModelConfig) {
        const session = createEmptySession();
        if (modelConfig) {
          const config = useAppConfig.getState();
          const globalModelConfig = config.modelConfig;
          session.modelConfig = { ...globalModelConfig, ...modelConfig };
        }
        set(state => ({ // Immutable update
          sessions: [session, ...state.sessions],
          currentSessionIndex: 0,
        }));
      },
      nextSession(delta: number) {
         const n = get().sessions.length;
         const limit = (x: number) => (x + n) % n;
         const i = get().currentSessionIndex;
         get().selectSession(limit(i + delta));
      },
      deleteSession(index: number) {
          const state = _get(); // Use _get provided by Zustand
          const deletingLastSession = state.sessions.length === 1;
          const deletedSession = state.sessions.at(index);
          if (!deletedSession) return;

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
          set({ sessions, currentSessionIndex: nextIndex }); // Immutable update
            // TODO: Restore state / Toast logic needs context or separate handling
      },
      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;
        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set({ currentSessionIndex: index });
        }
        return sessions.at(index); // Use .at() for safety
      },
      onNewMessage(message: ChatMessage, targetSession: ChatSession, api: ClientApi) {
          get().updateTargetSession(targetSession, (session) => {
            session.messages = session.messages.concat(); // Trigger update
            session.lastUpdate = Date.now();
          });
          get().updateStat(message, targetSession);
          const updatedSession = get().sessions.find(s => s.id === targetSession.id);
          if (updatedSession) {
            get().summarizeSession(false, updatedSession, api);
          }
      },
      async onUserInput(content: string, api: ClientApi, attachImages?: string[], isMcpResponse?: boolean) {
        const session = get().currentSession();
        if (!session) return;
        const modelConfig = session.modelConfig;

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
          content: mContent as any, // Use as any or adjust based on ChatMessage['content'] type
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
        });

        const recentMessages = await get().getMessagesWithMemory();
        const sendMessages = recentMessages.concat(userMessage);
        const messageIndex = session.messages.length + 1;

        get().updateTargetSession(session, (sess) => {
           const savedUserMessage = { ...userMessage, content: mContent as any };
           sess.messages = [...sess.messages, savedUserMessage, botMessage];
        });

        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            get().updateTargetSession(session, (sess) => {
              const botMsgIndex = sess.messages.findIndex(m => m.id === botMessage.id);
              if (botMsgIndex !== -1) {
                const updatedMsg = { ...sess.messages[botMsgIndex], content: message, streaming: true };
                sess.messages = sess.messages.map((m, i) => i === botMsgIndex ? updatedMsg : m);
              }
            });
          },
          async onFinish(message) {
            get().updateTargetSession(session, (sess) => {
              const botMsgIndex = sess.messages.findIndex(m => m.id === botMessage.id);
              if (botMsgIndex !== -1) {
                const finalBotMessage = { ...sess.messages[botMsgIndex], content: message, streaming: false, date: new Date().toLocaleString() };
                sess.messages = sess.messages.map((m, i) => i === botMsgIndex ? finalBotMessage : m);
                get().onNewMessage(finalBotMessage, sess, api);
              }
            });
            ChatControllerPool.remove(session.id, botMessage.id);
          },
          onError(error) {
             const isAborted = error.message?.includes?.("aborted");
            get().updateTargetSession(session, (sess) => {
               const userMsgIndex = sess.messages.findIndex(m => m.id === userMessage.id);
               const botMsgIndex = sess.messages.findIndex(m => m.id === botMessage.id);
               const newMessages = [...sess.messages];
               if (userMsgIndex !== -1) { newMessages[userMsgIndex] = { ...newMessages[userMsgIndex], isError: !isAborted }; }
               if (botMsgIndex !== -1) { newMessages[botMsgIndex] = { ...newMessages[botMsgIndex], content: (newMessages[botMsgIndex].content || "") + "\n\n" + prettyObject({ error: true, message: error.message }), streaming: false, isError: !isAborted }; }
               sess.messages = newMessages;
            });
            ChatControllerPool.remove(session.id, botMessage.id ?? messageIndex);
            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            ChatControllerPool.addController(session.id, botMessage.id ?? messageIndex, controller);
          },
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
            get().summarizeTopicIfNeeded(session, api, modelConfig, model, providerName, refreshTitle, config);
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
                if (responseRes?.status === 200) { get().updateTargetSession(session, (sess) => sess.topic = message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC); }
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
      updateTargetSession(targetSession: ChatSession, updater: (session: ChatSession) => void) {
          set(state => {
             const index = state.sessions.findIndex(s => s.id === targetSession.id);
             if (index < 0) return state;
             const newSessions = state.sessions.slice();
             const sessionToUpdate = { ...newSessions[index] };
             updater(sessionToUpdate);
             newSessions[index] = sessionToUpdate;
             return { ...state, sessions: newSessions };
          });
      },

      // --- Auth related actions (Keep as is) ---
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

      // Action to update the current session's model config based on provider
      updateCurrentSessionConfigForProvider(provider: ServiceProvider) {
        const session = get().currentSession();
        if (!session) return;

        let defaultModelName = DEFAULT_OPENAI_MODEL_NAME;
        let defaultProviderName = ServiceProvider.OpenAI;

        if (provider === ServiceProvider.Panda) {
          defaultModelName = DEFAULT_PANDA_MODEL_NAME;
          defaultProviderName = ServiceProvider.Panda;
        }
        // Add cases for other providers if needed

        get().updateTargetSession(session, (sess) => {
          sess.modelConfig = {
            ...sess.modelConfig, // Keep existing session settings like temp, etc.
            model: defaultModelName as ModelType,
            providerName: defaultProviderName,
          };
        });
      },

      // Action to update the model config for the current session
      updateCurrentSessionModel(model: ModelType, providerName: ServiceProvider) {
        const session = get().currentSession();
        console.log("[Update Current Session Model] ", model, providerName);
        if (!session) return;

        get().updateTargetSession(session, (sess) => {
          sess.modelConfig = {
            ...sess.modelConfig, // Keep existing session settings like temp, etc.
            model: model,
            providerName: providerName,
          };
        });
      },
    };

    return methods;
  },
  {
    name: StoreKey.Chat,
    version: 1.0,
    storage: indexedDBStorage as any,
  },
);

// --- Auth Listener Component (to be placed in providers.tsx) ---

export function AuthChatListener() {
  const { ready, authenticated } = usePrivy();
  const clearCurrentStateToDefault = useChatStore((state: any) => state.clearCurrentStateToDefault);

  const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (isInitialLoad) {
      setPrevAuthState(authenticated);
      setIsInitialLoad(false);
      console.log("[AuthChatListener] Initial auth state:", authenticated);
      return;
    }

    if (authenticated !== prevAuthState) {
      console.log(`[AuthChatListener] Auth state changed from ${prevAuthState} to ${authenticated}. Reloading page.`);
      if (typeof clearCurrentStateToDefault === 'function') {
          clearCurrentStateToDefault();
      } else {
          console.warn("[AuthChatListener] clearCurrentStateToDefault action not available or not a function yet.");
      }
      window.location.reload();
    }

  }, [ready, authenticated, prevAuthState, isInitialLoad, clearCurrentStateToDefault]);

  return null; // No UI
}
