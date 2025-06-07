export const OWNER = "testinprod-io";
export const REPO = "panda-web";
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
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
  SearchChat = "/search-chat",
}

export enum ApiPath {
  Cors = "",
  Panda = "/api/panda",
}

export const PandaPath = {
  ChatPath: "v1/chat/completions",
  SummaryPath: "v1/summary",
  InfoPath: "v1/info",
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

export const STORAGE_KEY = "panda-web";

export const REQUEST_TIMEOUT_MS = 60000;
export const REQUEST_TIMEOUT_MS_FOR_THINKING = REQUEST_TIMEOUT_MS * 5;

export const EXPORT_MESSAGE_CLASS_NAME = "export-markdown";

export enum ServiceProvider {
  Panda = "Panda",
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
  Panda = "Panda",
}

export const DEFAULT_INPUT_TEMPLATE = `{{input}}`; // input / time / model / lang
export const DEFAULT_SYSTEM_TEMPLATE = `
You are a large language model trained by {{ServiceProvider}}.
Knowledge cutoff: {{cutoff}}
Current model: {{model}}
Current time: {{time}}
Latex inline: \\(x^2\\)
Latex block: $$e=mc^2$$
`;

export const DEFAULT_PANDA_MODEL_NAME = "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B";

export const KnowledgeCutOffDate: Record<string, string> = {
  default: "2023-10",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B": "2023-10",
  "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16": "2024-01", // Example, adjust if needed
};

export const VISION_MODEL_REGEXES = [
  /Panda2\\.5-Omni-7B/i, // Specifically target Qwen/Qwen2.5-Omni-7B
  /vision/i, // Keep general vision keyword if model names might include it
];

// Helper function to generate environment variable names for model endpoints
function getModelEndpointEnvVarName(modelName: string): string {
  const slug = modelName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return `NEXT_PUBLIC_MODEL_ENDPOINT_${slug}`;
}

const PandaModels = [
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
  "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16",
];

let seq = 1000;

export interface ModelConfig {
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
  name: string;
  displayName: string;
  endpoint: string;
}

// Define a base config for common models
export const BASE_MODEL_CONFIG: ModelConfig = {
  name: "",
  displayName: "",
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
  endpoint: "",
};

export interface AppModelDefinition {
  name: string;
  displayName?: string;
  description?: string;
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
  config: ModelConfig;
}
export type ModelType = AppModelDefinition["name"];

export const DEFAULT_MODELS: AppModelDefinition[] = [
  ...PandaModels.map((name) => {
    let config: ModelConfig;
    let isVision = false;

    // Default endpoint, can be overridden by environment variables
    let defaultEndpoint = "";
    let description = "";
    if (name === "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B") {
      defaultEndpoint = process.env.NEXT_PUBLIC_LLM_SERVER_ENDPOINT || "";
      description = "Great for most tasks";
    } else if (
      name === "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16"
    ) {
      defaultEndpoint = process.env.NEXT_PUBLIC_LLM_OMNI_SERVER_ENDPOINT || "";
      description = "Great for handling files and photos";
    }

    if (name === "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B") {
      config = {
        ...BASE_MODEL_CONFIG,
        name: name,
        displayName: name.split("/")[0],
        max_tokens: 8000, // Example
        reasoning: true,
        endpoint: defaultEndpoint,
      };
      isVision = false;
    } else if (
      name === "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16"
    ) {
      config = {
        ...BASE_MODEL_CONFIG,
        name: name,
        displayName: name.split("/")[0],
        max_tokens: 16000, // Example for vision model
        reasoning: true,
        endpoint: defaultEndpoint,
      };
      isVision = true;
    } else {
      // Fallback, though ideally all PandaModels are handled above
      config = {
        ...BASE_MODEL_CONFIG,
        name: name,
        displayName: name,
        reasoning: true,
        endpoint: defaultEndpoint,
      };
    }

    return {
      name,
      displayName: name.split("/")[0],
      available: true, // Assuming Panda models are available by default
      sorted: seq++,
      description: description,
      provider: {
        id: "panda",
        providerName: "Panda",
        providerType: "panda",
        sorted: 1, // Only one provider now
      },
      knowledgeCutoff: KnowledgeCutOffDate[name] || KnowledgeCutOffDate.default,
      isVisionModel: isVision, // Use specific assignment
      config: config,
    };
  }),
];

export const CHAT_PAGE_SIZE = 15;
export const MAX_RENDER_MSG_COUNT = 45;
