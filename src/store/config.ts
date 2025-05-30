import { LLMModel } from "@/client/api";

import {
  // DEFAULT_INPUT_TEMPLATE, // This is part of BASE_MODEL_CONFIG, not directly used in store
  DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
  ServiceProvider,
  // DEFAULT_OPENAI_MODEL_NAME, // Removed
  DEFAULT_PANDA_MODEL_NAME, // Used for default model selection
  AppModelDefinition,
  ModelConfig,
  ModelType,
} from "@/types/constant";
import { createPersistStore } from "@/utils/store";
import { useChatStore } from "./chat";
// import { indexedDBStorage } from "@/utils/indexedDB-storage"; // OLD IMPORT
import { indexedDBStorage } from "@/utils/indexedDB-storage"; // NEW IMPORT
import { createJSONStorage } from "zustand/middleware";
import { CustomizedPromptsData } from "@/types";

// Re-export ServiceProvider if it's defined in constant.ts
export { ServiceProvider } from "@/types/constant";


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

// Find the default model config from DEFAULT_MODELS
const defaultModelDefinition = 
  DEFAULT_MODELS.find(m => m.name === DEFAULT_PANDA_MODEL_NAME && m.available) || 
  DEFAULT_MODELS.find(m => m.available) || 
  DEFAULT_MODELS[0]; // Fallback to the very first model if none are marked available

if (!defaultModelDefinition) {
  // This case should ideally not be reached if DEFAULT_MODELS has at least one entry.
  throw new Error("No default model definition found in DEFAULT_MODELS. Ensure app/constant.ts is configured.");
}

export const DEFAULT_CONFIG = {
  lastUpdate: Date.now(), // timestamp, to merge state

  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  fontSize: 16,
  fontFamily: "Inter",
  theme: Theme.Auto as Theme,
  tightBorder: false,
  sendPreviewBubble: false,
  enableAutoGenerateTitle: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

  apiProvider: ServiceProvider.Panda, // Hardcode to Panda

  enableArtifacts: true,
  enableCodeFold: true,
  disablePromptHint: true,
  dontShowMaskSplashScreen: false,
  hideBuiltinMasks: false,

  customModels: "", // This might be less relevant if models are strictly from Panda backend
  models: DEFAULT_MODELS,

  modelConfig: {
    ...defaultModelDefinition.config,
    model: defaultModelDefinition.name as ModelType,
    providerName: defaultModelDefinition.provider.providerName as ServiceProvider,
    // stream and reasoning are part of DetailedModelConfig now
    // Other fields like sendMemory, historyMessageCount, compressMessageLengthThreshold, enableInjectSystemPrompts, template are also in DetailedModelConfig
  },

  customizedPrompts: {
    enabled: false,
    personal_info: { name: '', job: '' },
    prompts: { traits: '', extra_params: '' },
  } as CustomizedPromptsData,
};

export type ChatConfig = typeof DEFAULT_CONFIG;

// ModelConfig is already redefined above
// export type ModelConfig = ChatConfig["modelConfig"];

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
  DEFAULT_CONFIG ,
  (set, get) => ({
    reset() {
      // When resetting, ensure it uses the potentially updated DEFAULT_CONFIG from constants
      const currentDefaultModel = 
        DEFAULT_MODELS.find(m => m.name === DEFAULT_PANDA_MODEL_NAME && m.available) || 
        DEFAULT_MODELS.find(m => m.available) || 
        DEFAULT_MODELS[0];
      
      if (!currentDefaultModel) {
        // Should not happen with current setup of DEFAULT_MODELS
        throw new Error("Failed to find a default model on reset.");
      }

      set(() => ({
        ...DEFAULT_CONFIG, // Spread the base structure
        apiProvider: ServiceProvider.Panda, // Ensure Panda provider
        models: DEFAULT_MODELS, // Reset models list
        modelConfig: { // Reset modelConfig based on the current default Panda model
          ...currentDefaultModel.config,
          model: currentDefaultModel.name as ModelType,
          providerName: currentDefaultModel.provider.providerName as ServiceProvider,
        },
      }));
    },

    setApiProvider(modelName: ModelType) {
      console.log("[AppConfigStore] setApiProvider called with:", { modelName });
      const models = get().models; // These are AppModelDefinition[]
      const selectedModelDetail = models.find(
        (m) => m.name === modelName,
      );

      if (selectedModelDetail) {
        console.log("[AppConfigStore] setApiProvider - model found:", { selectedModelDetail });
        // selectedModelDetail.config is ModelConfig from app/constant.ts (name, displayName, temp, etc.)
        // selectedModelDetail.name is the ModelType
        // appConfig.modelConfig needs fields like 'model', 'providerName', and the ones from ModelConfig (app/constant)
        set(state => {
          console.log("[AppConfigStore] setApiProvider - setting new state with modelConfig:", { modelConfig: selectedModelDetail.config, modelName: selectedModelDetail.name });
          return {
            ...state,
            modelConfig: {
              ...selectedModelDetail.config, // Spread fields from selected model's config (temp, top_p, name, displayName etc.)
              model: selectedModelDetail.name as ModelType, // Explicitly set the 'model' field for appConfig.modelConfig
              providerName: ServiceProvider.Panda,      // Explicitly set top-level 'providerName' for appConfig.modelConfig
            },
          };
        });
        
        // Update the current chat session to use the selected model's specific config
        // selectedModelDetail.config is (ModelConfig from app/constant.ts)
        console.log("[AppConfigStore] setApiProvider - updating current chat session model with:", selectedModelDetail.config);
        useChatStore.getState().updateCurrentSessionModel(selectedModelDetail.config);
      } else {
        console.warn(`[AppConfigStore] setApiProvider - Model ${modelName} with provider Panda not found. Cannot set API provider.`);
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
      console.log("[AppConfigStore] mergeModels - initial modelMap (all set to unavailable):", { modelMap: { ...modelMap } });

      for (const newModel of newModels) {
        // Assuming newModels from API will also have provider.id = 'panda'
        const key = `${newModel.name}@${newModel.provider.id}`;
        if (modelMap[key]) {
          console.log(`[AppConfigStore] mergeModels - updating existing model: ${key}`, { newModelData: newModel });
          modelMap[key].available = newModel.available; 
          if (newModel.displayName) modelMap[key].displayName = newModel.displayName;
        } else {
          // If API returns a Panda model not in our predefined list, how to handle?
          // For now, we only update availability of predefined models.
          console.warn(`[AppConfigStore] mergeModels - New model ${newModel.name} from Panda API not in predefined app/constant.ts models. It will be ignored for now.`, { newModel });
          // To truly support dynamic models from Panda backend not in constants, we'd need a default AppModelDefinition structure here.
        }
      }
      console.log("[AppConfigStore] mergeModels - final modelMap before setting state:", { modelMap: { ...modelMap } });

      set(() => {
        const updatedModels = Object.values(modelMap);
        console.log("[AppConfigStore] mergeModels - setting new models state:", { updatedModels });
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
    version: 1.2, // Incremented version due to significant model changes
    storage: createJSONStorage(() => indexedDBStorage), // NEW: Pass the function directly

    // onRehydrateStorage: (state: any) => {
    //   console.log("[AppConfigStore] onRehydrateStorage called with persisted state:", state);
    //   // console.log("[ConfigStore] Hydration finished."); // Original log, can be kept or removed
    //   return (hydratedState: any, error: any) => {
    //       if (error) {
    //           // console.error("[ConfigStore] Error during rehydration:", error); // Original log
    //           console.error("[AppConfigStore] onRehydrateStorage - error during rehydration:", { error, hydratedState });
    //       } else {
    //           //  console.log("[ConfigStore] Rehydration successful."); // Original log
    //            console.log("[AppConfigStore] onRehydrateStorage - rehydration successful. Hydrated state:", hydratedState);
    //       }
    //   }
    // },
  },
  
);

