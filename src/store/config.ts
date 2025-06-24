import { ServerModelInfo } from "@/client/types";
import {
  // DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
  ServiceProvider,
  DEFAULT_PANDA_MODEL_NAME,
  // AppModelDefinition,
  // ModelType,
  // BASE_MODEL_CONFIG,
  KnowledgeCutOffDate,
  // ModelConfig,
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
  
  models: ServerModelInfo[];
  defaultModel: string;

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
  defaultModel: "",
  
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

    setApiProvider(modelName: string) {
      console.log("[AppConfigStore] setApiProvider called with:", {
        modelName,
      });
      const models = get().models;
      const selectedModelDetail = models.find((m) => m.model_name === modelName);

      if (selectedModelDetail) {
        set((state) => {
          return {
            ...state,
            defaultModel: modelName,
          };
        });
      } else {
        console.warn(
          `[AppConfigStore] setApiProvider - Model ${modelName} with provider Panda not found. Cannot set API provider.`,
        );
      }
    },

    setModels(serverModels: ServerModelInfo[]) {
      set({ models: serverModels });

      const currentModelName = get().defaultModel;
      const isCurrentModelInNewList = serverModels.some(
        (m) => m.name === currentModelName,
      );

      if (
        (!currentModelName || !isCurrentModelInNewList) &&
        serverModels.length > 0
      ) {
        const defaultModel = serverModels[0];
        if (defaultModel) {
          set((state) => ({
            ...state,
            defaultModel: defaultModel.model_name,
          }));
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
          lastUpdate: Date.now(),
        };
      }
      return { ...DEFAULT_CONFIG, ...oldState } as ChatConfig;
    },
  },
);
