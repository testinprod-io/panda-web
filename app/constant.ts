// export const OPENAI_BASE_URL = "https://api.openai.com";
// export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const PANDA_BASE_URL = "http://4.246.68.189:8000/"; // "http://4.246.68.189:8000/";
// export const PANDA_BASE_URL = "http://52.225.128.77:8000/";
// export const XAI_BASE_URL = "https://api.x.ai";

export const OWNER = "ChatGPTNextWeb";
export const REPO = "ChatGPT-Next-Web";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const PLUGINS_REPO_URL = `https://github.com/${OWNER}/NextChat-Awesome-Plugins`;
export const ISSUE_URL = `https://github.com/${OWNER}/${REPO}/issues`;
export const UPDATE_URL = `${REPO_URL}#keep-updated`;
export const RELEASE_URL = `${REPO_URL}/releases`;
export const FETCH_COMMIT_URL = `https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=1`;
export const FETCH_TAG_URL = `https://api.github.com/repos/${OWNER}/${REPO}/tags?per_page=1`;
export const RUNTIME_CONFIG_DOM = "danger-runtime-config";

export const CACHE_URL_PREFIX = "/api/cache";
export const UPLOAD_URL = `${CACHE_URL_PREFIX}/upload`;

export enum Path {
  Home = "/",
  Chat = "/chat",
  NewChat = "/new-chat",
  Settings = "/settings",
  Masks = "/masks",
  Plugins = "/plugins",
  McpMarket = "/mcp-market",
  Auth = "/auth",
  Artifacts = "/artifacts",
  SearchChat = "/search-chat"
}


export enum ApiPath {
  Cors = "",
  Panda = "/api/panda",
  // OpenAI = "/api/openai",
  // XAI = "/api/xai",
  // DeepSeek = "/api/deepseek",
}

export const PandaPath = {
  ChatPath: "v1/chat/completions",
  ListModelPath: "v1/models",
};

export enum SlotID {
  AppBody = "app-body",
  CustomModel = "custom-model",
}

export enum FileName {
  Masks = "masks.json",
  Prompts = "prompts.json",
}

export enum StoreKey {
  Chat = "chat-next-web-store",
  Plugin = "chat-next-web-plugin",
  Access = "access-control",
  Config = "app-config",
  Mask = "mask-store",
  Prompt = "prompt-store",
  Update = "chat-update",
  Sync = "sync",
  Mcp = "mcp-store",
}

export const DEFAULT_SIDEBAR_WIDTH = 300;
export const MAX_SIDEBAR_WIDTH = 500;
export const MIN_SIDEBAR_WIDTH = 230;
export const NARROW_SIDEBAR_WIDTH = 100;

export const ACCESS_CODE_PREFIX = "nk-";

export const LAST_INPUT_KEY = "last-input";
export const UNFINISHED_INPUT = (id: string) => "unfinished-input-" + id;

export const STORAGE_KEY = "chatgpt-next-web";

export const REQUEST_TIMEOUT_MS = 60000;
export const REQUEST_TIMEOUT_MS_FOR_THINKING = REQUEST_TIMEOUT_MS * 5;

export const EXPORT_MESSAGE_CLASS_NAME = "export-markdown";

export enum ServiceProvider {
  // OpenAI = "OpenAI",
  Panda = "Panda",
  // XAI = "XAI",
  // DeepSeek = "DeepSeek",
}

// Google API safety settings, see https://ai.google.dev/gemini-api/docs/safety-settings
// BLOCK_NONE will not block any content, and BLOCK_ONLY_HIGH will block only high-risk content.
export enum GoogleSafetySettingsThreshold {
  BLOCK_NONE = "BLOCK_NONE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
}

export enum ModelProvider {
  // GPT = "GPT",
  Panda = "Panda",
  // XAI = "XAI",
  // DeepSeek = "DeepSeek",
}

// export const OpenaiPath = {
//   ChatPath: "v1/chat/completions",
//   SpeechPath: "v1/audio/speech",
//   ImagePath: "v1/images/generations",
//   UsagePath: "dashboard/billing/usage",
//   SubsPath: "dashboard/billing/subscription",
//   ListModelPath: "v1/models",
// };

// export const DeepSeek = {
//   ExampleEndpoint: DEEPSEEK_BASE_URL,
//   ChatPath: "chat/completions",
// };

// export const XAI = {
//   ExampleEndpoint: XAI_BASE_URL,
//   ChatPath: "v1/chat/completions",
// };


export const DEFAULT_INPUT_TEMPLATE = `{{input}}`; // input / time / model / lang
export const DEFAULT_SYSTEM_TEMPLATE = `
You are a large language model trained by {{ServiceProvider}}.
Knowledge cutoff: {{cutoff}}
Current model: {{model}}
Current time: {{time}}
Latex inline: \\(x^2\\)
Latex block: $$e=mc^2$$
`;

// Default model names for switching providers
// export const DEFAULT_OPENAI_MODEL_NAME = "gpt-4o-mini";
export const DEFAULT_PANDA_MODEL_NAME = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B";

// export const SUMMARIZE_MODEL = "gpt-4o-mini";
// export const GEMINI_SUMMARIZE_MODEL = "gemini-pro";
// export const DEEPSEEK_SUMMARIZE_MODEL = "deepseek-chat";

export const KnowledgeCutOffDate: Record<string, string> = {
  default: "2023-10",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B": "2023-10",
  "Qwen/Qwen2.5-Omni-7B": "2024-01", // Example, adjust if needed
  // "gpt-4-turbo": "2023-12",
  // "gpt-4-turbo-2024-04-09": "2023-12",
  // "gpt-4-turbo-preview": "2023-12",
  // "gpt-4o": "2023-10",
  // "gpt-4o-2024-05-13": "2023-10",
  // "gpt-4o-2024-08-06": "2023-10",
  // "gpt-4o-2024-11-20": "2023-10",
  // "chatgpt-4o-latest": "2023-10",
  // "gpt-4o-mini": "2023-10",
  // "gpt-4o-mini-2024-07-18": "2023-10",
  // "gpt-4-vision-preview": "2023-04",
  // "o1-mini-2024-09-12": "2023-10",
  // "o1-mini": "2023-10",
  // "o1-preview-2024-09-12": "2023-10",
  // "o1-preview": "2023-10",
  // "o1-2024-12-17": "2023-10",
  // o1: "2023-10",
  // "o3-mini-2025-01-31": "2023-10",
  // "o3-mini": "2023-10",
  // "gemini-pro": "2023-12",
  // "gemini-pro-vision": "2023-12",
  // "deepseek-chat": "2024-07",
  // "deepseek-coder": "2024-07",
};

export const VISION_MODEL_REGEXES = [
  /Panda2\.5-Omni-7B/i, // Specifically target Qwen/Qwen2.5-Omni-7B
  /vision/i, // Keep general vision keyword if model names might include it
];

export const EXCLUDE_VISION_MODEL_REGEXES = [
  // Add "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B" here if VISION_MODEL_REGEXES is too broad,
  // or ensure VISION_MODEL_REGEXES is specific enough.
  // For now, with specific Qwen/Qwen2.5-Omni-7B regex, this might not be strictly needed
  // unless other regexes accidentally catch the non-vision model.
];

// const openaiModels = [
//   "gpt-3.5-turbo",
//   "gpt-4",
//   "gpt-4-turbo",
//   "gpt-4o",
// ];

// const deepseekModels = ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"];

// const xAIModes = [
//   "grok-beta",
//   "grok-2",
//   "grok-2-1212",
//   "grok-2-latest",
//   "grok-vision-beta",
//   "grok-2-vision-1212",
//   "grok-2-vision",
//   "grok-2-vision-latest",
// ];

const PandaModels = [
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
  "Qwen/Qwen2.5-Omni-7B",
];

let seq = 1000;

export interface DetailedModelConfig {
  temperature: number;
  top_p: number;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
  sendMemory: boolean;
  historyMessageCount: number;
  compressMessageLengthThreshold: number;
  compressModel?: string;
  compressProviderName?: string;
  enableInjectSystemPrompts: boolean;
  template: string;
  stream: boolean;
  reasoning?: boolean;
}

// Define a base config for common models
export const BASE_MODEL_CONFIG: DetailedModelConfig = {
  temperature: 0.7,
  top_p: 1.0,
  max_tokens: 4096,
  presence_penalty: 0,
  frequency_penalty: 0,
  sendMemory: true,
  historyMessageCount: 4,
  compressMessageLengthThreshold: 1000,
  compressModel: "",
  compressProviderName: "",
  enableInjectSystemPrompts: true,
  template: DEFAULT_INPUT_TEMPLATE,
  stream: true,
  reasoning: false,
};

export interface AppModelDefinition {
  name: string;
  displayName?: string;
  available: boolean;
  provider: {
    id: string;
    providerName: string;
    providerType: string;
    sorted: number;
  };
  sorted: number;
  knowledgeCutoff: string;
  isVisionModel: boolean;
  config: DetailedModelConfig;
}

export const DEFAULT_MODELS: AppModelDefinition[] = [
  ...PandaModels.map((name) => {
    let config: DetailedModelConfig;
    let isVision = false;

    if (name === "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B") {
      config = { 
        ...BASE_MODEL_CONFIG, 
        max_tokens: 8000, // Example
        reasoning: true,
      };
      isVision = false;
    } else if (name === "Qwen/Qwen2.5-Omni-7B") {
      config = { 
        ...BASE_MODEL_CONFIG, 
        max_tokens: 16000, // Example for vision model
        reasoning: true,
      };
      isVision = true;
    } else {
      // Fallback, though ideally all PandaModels are handled above
      config = { ...BASE_MODEL_CONFIG, reasoning: true };
    }
    
    return {
      name,
      available: true, // Assuming Panda models are available by default
      sorted: seq++,
      provider: {
        id: "panda",
        providerName: "Panda",
        providerType: "panda",
        sorted: 1, // Only one provider now
      },
      knowledgeCutoff: KnowledgeCutOffDate[name] || KnowledgeCutOffDate.default,
      isVisionModel: isVision, // Use specific assignment
      config,
    };
  }),
  // ...xAIModes.map((name) => ({
  //   name,
  //   available: false,
  //   sorted: seq++,
  //   provider: {
  //     id: "xai",
  //     providerName: "XAI",
  //     providerType: "xai",
  //     sorted: 3,
  //   },
  //   knowledgeCutoff: KnowledgeCutOffDate[name] || KnowledgeCutOffDate.default,
  //   isVisionModel: checkIsVisionModel(name),
  //   config: { ...BASE_MODEL_CONFIG, max_tokens: name.includes("vision") ? 32000 : 8000 }, 
  // })),
  // ...deepseekModels.map((name) => ({
  //   name,
  //   available: false,
  //   sorted: seq++,
  //   provider: {
  //     id: "deepseek",
  //     providerName: "DeepSeek",
  //     providerType: "deepseek",
  //     sorted: 4,
  //   },
  //   knowledgeCutoff: KnowledgeCutOffDate[name] || KnowledgeCutOffDate.default,
  //   isVisionModel: checkIsVisionModel(name),
  //   config: name.includes("coder") ? DEEPSEEK_CODER_CONFIG : DEEPSEEK_CHAT_CONFIG,
  // })),
  // ...openaiModels.map((name) => {
  //   let modelConfig = GPT4O_MINI_CONFIG; 
  //   if (name === "gpt-4-turbo" || name.startsWith("gpt-4-turbo-") || name.startsWith("o1-preview") || name.startsWith("o1-2024")) {
  //     modelConfig = GPT4_TURBO_CONFIG;
  //   } else if (name === "gpt-4" || (name.startsWith("gpt-4-") && !name.includes("vision"))) {
  //      modelConfig = { ...BASE_MODEL_CONFIG, max_tokens: 8192 };
  //   } else if (name.includes("vision") || name.startsWith("gpt-4o")) {
  //     modelConfig = name === "gpt-4o" ? {...GPT4_TURBO_CONFIG } : GPT4O_MINI_CONFIG; 
  //   } else if (name === "gpt-3.5-turbo") {
  //     modelConfig = { ...BASE_MODEL_CONFIG, max_tokens: 16385 }; 
  //   }
  //   return {
  //     name,
  //     available: true,
  //     sorted: seq++, 
  //     provider: {
  //       id: "openai",
  //       providerName: "OpenAI",
  //       providerType: "openai",
  //       sorted: 1, 
  //     },
  //     knowledgeCutoff: KnowledgeCutOffDate[name] || KnowledgeCutOffDate.default,
  //     isVisionModel: checkIsVisionModel(name),
  //     config: modelConfig,
  //   };
  // }),
];

export const CHAT_PAGE_SIZE = 15;
export const MAX_RENDER_MSG_COUNT = 45;

// some famous webdav endpoints
export const internalAllowedWebDavEndpoints = [
  "https://dav.jianguoyun.com/dav/",
  "https://dav.dropdav.com/",
  "https://dav.box.com/dav",
  "https://nanao.teracloud.jp/dav/",
  "https://bora.teracloud.jp/dav/",
  "https://webdav.4shared.com/",
  "https://dav.idrivesync.com",
  "https://webdav.yandex.com",
  "https://app.koofr.net/dav/Koofr",
];

export const DEFAULT_GA_ID = "G-89WN60ZK2E";

export const SAAS_CHAT_URL = "https://nextchat.club";
export const SAAS_CHAT_UTM_URL = "https://nextchat.club?utm=github";

// Helper function to check if a model is a vision model - CAN BE REMOVED if isVisionModel is set directly
// const checkIsVisionModel = (modelName: string): boolean => {
//   if (EXCLUDE_VISION_MODEL_REGEXES.some(regex => regex.test(modelName))) {
//     return false;
//   }
//   return VISION_MODEL_REGEXES.some(regex => regex.test(modelName));
// };

export type ModelType = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B" | "Qwen/Qwen2.5-Omni-7B";
