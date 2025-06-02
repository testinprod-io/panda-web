import { LLMModel } from "@/client/api";

import {
  DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
  ServiceProvider,
  DEFAULT_PANDA_MODEL_NAME,
  AppModelDefinition,
  ModelType,
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

const defaultModelDefinition =
  DEFAULT_MODELS.find(
    (m) => m.name === DEFAULT_PANDA_MODEL_NAME && m.available,
  ) ||
  DEFAULT_MODELS.find((m) => m.available) ||
  DEFAULT_MODELS[0];

if (!defaultModelDefinition) {
  throw new Error(
    "No default model definition found in DEFAULT_MODELS. Ensure app/constant.ts is configured.",
  );
}

export const DEFAULT_CONFIG = {
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
  models: DEFAULT_MODELS,

  modelConfig: {
    ...defaultModelDefinition.config,
    model: defaultModelDefinition.name as ModelType,
    providerName: defaultModelDefinition.provider
      .providerName as ServiceProvider,
  },

  customizedPrompts: {
    enabled: false,
    personal_info: { name: "", job: "" },
    prompts: { traits: "", extra_params: "" },
  } as CustomizedPromptsData,
};

export type ChatConfig = typeof DEFAULT_CONFIG;

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

export const ModalConfigValidator = {
  model(x: string) {
    return x as ModelType;
  },
  max_tokens(x: number) {
    return limitNumber(x, 0, 512000, 1024);
  },
  presence_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  frequency_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  temperature(x: number) {
    return limitNumber(x, 0, 2, 1);
  },
  top_p(x: number) {
    return limitNumber(x, 0, 1, 1);
  },
};

export const useAppConfig = createPersistStore(
  DEFAULT_CONFIG,
  (set, get) => ({
    reset() {
      // When resetting, ensure it uses the potentially updated DEFAULT_CONFIG from constants
      const currentDefaultModel =
        DEFAULT_MODELS.find(
          (m) => m.name === DEFAULT_PANDA_MODEL_NAME && m.available,
        ) ||
        DEFAULT_MODELS.find((m) => m.available) ||
        DEFAULT_MODELS[0];

      if (!currentDefaultModel) {
        throw new Error("Failed to find a default model on reset.");
      }

      set(() => ({
        ...DEFAULT_CONFIG,
        apiProvider: ServiceProvider.Panda,
        models: DEFAULT_MODELS,
        modelConfig: {
          ...currentDefaultModel.config,
          model: currentDefaultModel.name as ModelType,
          providerName: currentDefaultModel.provider
            .providerName as ServiceProvider,
        },
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

    setCustomizedPrompts(data: CustomizedPromptsData) {
      set(() => ({
        customizedPrompts: data,
      }));
    },

    mergeModels(newModels: LLMModel[]) {
      console.log("[AppConfigStore] mergeModels called with:", { newModels });
      const oldModels = get().models;
      console.log("[AppConfigStore] mergeModels - old models:", { oldModels });
      const modelMap: Record<string, AppModelDefinition> = {};

      for (const model of oldModels) {
        model.available = false;
        modelMap[`${model.name}@${model.provider.id}`] = model;
      }
      console.log(
        "[AppConfigStore] mergeModels - initial modelMap (all set to unavailable):",
        { modelMap: { ...modelMap } },
      );

      for (const newModel of newModels) {
        // Assuming newModels from API will also have provider.id = 'panda'
        const key = `${newModel.name}@${newModel.provider.id}`;
        if (modelMap[key]) {
          console.log(
            `[AppConfigStore] mergeModels - updating existing model: ${key}`,
            { newModelData: newModel },
          );
          modelMap[key].available = newModel.available;
          if (newModel.displayName)
            modelMap[key].displayName = newModel.displayName;
        } else {
          // If API returns a Panda model not in our predefined list, how to handle?
          // For now, we only update availability of predefined models.
          console.warn(
            `[AppConfigStore] mergeModels - New model ${newModel.name} from Panda API not in predefined app/constant.ts models. It will be ignored for now.`,
            { newModel },
          );
          // To truly support dynamic models from Panda backend not in constants, we'd need a default AppModelDefinition structure here.
        }
      }
      console.log(
        "[AppConfigStore] mergeModels - final modelMap before setting state:",
        { modelMap: { ...modelMap } },
      );

      set(() => {
        const updatedModels = Object.values(modelMap);
        console.log(
          "[AppConfigStore] mergeModels - setting new models state:",
          { updatedModels },
        );
        return {
          models: updatedModels,
        };
      });
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

        const currentDefaultModelDef =
          DEFAULT_MODELS.find(
            (m) => m.name === DEFAULT_PANDA_MODEL_NAME && m.available,
          ) ||
          DEFAULT_MODELS.find((m) => m.available) ||
          DEFAULT_MODELS[0];

        if (!currentDefaultModelDef) {
          console.error(
            "[AppConfigStore] Migration error: Could not determine default model. Returning old state.",
          );
          return oldState as ChatConfig;
        }

        const migratedState: ChatConfig = {
          ...DEFAULT_CONFIG,
          ...oldState,
          models: DEFAULT_MODELS,
          modelConfig: {
            ...currentDefaultModelDef.config,
            model: currentDefaultModelDef.name as ModelType,
            providerName: currentDefaultModelDef.provider
              .providerName as ServiceProvider,
          },
          lastUpdate: Date.now(),
        };
        console.log(
          "[AppConfigStore] Migration successful to version 1.3.",
        );
        return migratedState;
      }
      return { ...DEFAULT_CONFIG, ...oldState } as ChatConfig;
    },
  },
);
