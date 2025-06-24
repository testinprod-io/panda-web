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
  Chat = "panda-store",
  Config = "app-config",
  User = "user-store",
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

export const DEFAULT_PANDA_MODEL_NAME = "ig1/r1-1776-AWQ";

export const KnowledgeCutOffDate: Record<string, string> = {
  default: "2023-10",
  "ig1/r1-1776-AWQ": "2023-10",
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

// export interface ModelConfig {
//   temperature: number;
//   top_p: number;
//   max_tokens: number;
//   features: string[];
//   stream: boolean;
//   reasoning?: boolean;
//   name: string;
//   displayName: string;
//   endpoint: string;
// }

// // Define a base config for common models
// export const BASE_MODEL_CONFIG: ModelConfig = {
//   name: "",
//   displayName: "",
//   temperature: 0.7,
//   top_p: 1.0,
//   max_tokens: 4096,
//   features: [],
//   stream: true,
//   reasoning: false,
//   endpoint: "",
// };

// export interface AppModelDefinition {
//   name: string;
//   displayName?: string;
//   description?: string;
//   config: ModelConfig;
// }
// export type ModelType = AppModelDefinition["name"];

// export const DEFAULT_MODELS: AppModelDefinition[] = [];

export const CHAT_PAGE_SIZE = 15;
export const MAX_RENDER_MSG_COUNT = 45;
