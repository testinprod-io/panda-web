import { ServerModelInfo } from "@/client/client";

import {
  DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
  ServiceProvider,
  DEFAULT_PANDA_MODEL_NAME,
  AppModelDefinition,
  ModelType,
  BASE_MODEL_CONFIG,
  KnowledgeCutOffDate,
  ModelConfig,
} from "@/types/constant";
import { createPersistStore } from "@/utils/store";
import { useChatStore } from "./chat";
import { indexedDBStorage } from "@/utils/indexedDB-storage";
import { createJSONStorage } from "zustand/middleware";
import { CustomizedPromptsData } from "@/types";

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}


export type ChatConfig = {
  lastUpdate: number;
  submitKey: SubmitKey;
  avatar: string;
  fontSize: number;
  fontFamily: string;
  theme: Theme;
  tightBorder: boolean;
  sendPreviewBubble: boolean;
  enableAutoGenerateTitle: boolean;
  sidebarWidth: number;
  apiProvider: ServiceProvider;
  enableArtifacts: boolean;
  enableCodeFold: boolean;
  disablePromptHint: boolean;
  dontShowMaskSplashScreen: boolean;
  hideBuiltinMasks: boolean;
  customModels: string;
  models: AppModelDefinition[];
  modelConfig: ModelConfig & {
    model: ModelType;
    providerName: ServiceProvider;
  };
  customizedPrompts: CustomizedPromptsData;
};

export const DEFAULT_CONFIG: ChatConfig = {
  lastUpdate: Date.now(),

  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  fontSize: 16,
  fontFamily: "Inter",
  theme: Theme.Auto as Theme,
  tightBorder: false,
  sendPreviewBubble: false,
  enableAutoGenerateTitle: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

  apiProvider: ServiceProvider.Panda,

  enableArtifacts: true,
  enableCodeFold: true,
  disablePromptHint: true,
  dontShowMaskSplashScreen: false,
  hideBuiltinMasks: false,

  customModels: "",
  models: [],

  modelConfig: {
    ...BASE_MODEL_CONFIG,
    model: "" as ModelType,
    providerName: ServiceProvider.Panda,
  },

  customizedPrompts: {
    enabled: false,
    personal_info: { name: "", job: "" },
    prompts: { traits: "", extra_params: "" },
  } as CustomizedPromptsData,
};

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export const useAppConfig = createPersistStore(
  DEFAULT_CONFIG,
  (set, get) => ({
    reset() {
      set(() => ({
        ...DEFAULT_CONFIG,
      }));
    },

    setApiProvider(modelName: ModelType) {
      console.log("[AppConfigStore] setApiProvider called with:", {
        modelName,
      });
      const models = get().models;
      const selectedModelDetail = models.find((m) => m.name === modelName);

      if (selectedModelDetail) {
        console.log("[AppConfigStore] setApiProvider - model found:", {
          selectedModelDetail,
        });
        set((state) => {
          console.log(
            "[AppConfigStore] setApiProvider - setting new state with modelConfig:",
            {
              modelConfig: selectedModelDetail.config,
              modelName: selectedModelDetail.name,
            },
          );
          return {
            ...state,
            modelConfig: {
              ...selectedModelDetail.config,
              model: selectedModelDetail.name as ModelType,
              providerName: ServiceProvider.Panda,
            },
          };
        });

        // Update the current chat session to use the selected model's specific config
        // selectedModelDetail.config is (ModelConfig from app/constant.ts)
        console.log(
          "[AppConfigStore] setApiProvider - updating current chat session model with:",
          selectedModelDetail.config,
        );
        useChatStore
          .getState()
          .updateCurrentSessionModel(selectedModelDetail.config);
      } else {
        console.warn(
          `[AppConfigStore] setApiProvider - Model ${modelName} with provider Panda not found. Cannot set API provider.`,
        );
      }
    },

    setModels(serverModels: ServerModelInfo[]) {
      const newModels: AppModelDefinition[] = serverModels.map((m) => {
        const config: ModelConfig = {
          ...BASE_MODEL_CONFIG,
          name: m.model_name,
          displayName: m.name,
          max_tokens: m.max_context_length,
          reasoning: true, 
          endpoint: m.url,
          features: m.supported_features,
        };

        return {
          name: m.model_name,
          displayName: m.name,
          description: m.description,
          config: config,
        };
      });

      set({ models: newModels });

      const currentModelName = get().modelConfig.model;
      const isCurrentModelInNewList = newModels.some(
        (m) => m.name === currentModelName,
      );

      if (
        (!currentModelName || !isCurrentModelInNewList) &&
        newModels.length > 0
      ) {
        const defaultModel = newModels[0];
        if (defaultModel) {
          set((state) => ({
            ...state,
            modelConfig: {
              ...defaultModel.config,
              model: defaultModel.name as ModelType,
              providerName: ServiceProvider.Panda,
            },
          }));
          useChatStore
            .getState()
            .updateCurrentSessionModel(defaultModel.config);
        }
      }
    },

    setCustomizedPrompts(data: CustomizedPromptsData) {
      set(() => ({
        customizedPrompts: data,
      }));
    },

    allModels() {
      return get().models;
    },
  }),
  {
    name: StoreKey.Config,
    version: 1.3,
    storage: createJSONStorage(() => indexedDBStorage),
    migrate: (persistedState: unknown, version: number): ChatConfig => {
      const oldState = persistedState as Partial<ChatConfig>;

      if (version < 1.3) {
        console.log(
          `[AppConfigStore] Migrating config from version ${version} to 1.3`,
        );
        return {
          ...DEFAULT_CONFIG,
          ...oldState,
          models: [],
          modelConfig: {
            ...BASE_MODEL_CONFIG,
            model: "" as ModelType,
            providerName: ServiceProvider.Panda,
          },
          lastUpdate: Date.now(),
        };
      }
      return { ...DEFAULT_CONFIG, ...oldState } as ChatConfig;
    },
  },
);
