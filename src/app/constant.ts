export const OPENAI_BASE_URL = "https://api.openai.com";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const PANDA_BASE_URL = "http://20.115.208.193:8000";
// export const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
// export const STABILITY_BASE_URL = "https://api.stability.ai";
// export const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com";

export enum Path {
  Home = "/",
  Chat = "/chat",
  Settings = "/settings",
  NewChat = "/new-chat",
}

export enum ApiPath {
  OpenAI = "/api/openai",
  DeepSeek = "/api/deepseek",
  Panda = "/api/panda",
  // Azure = "/api/azure",
  // Claude = "/api/claude",
  // GeminiPro = "/api/geminipro",
}

export enum ServiceProvider {
  OpenAI = "OpenAI",
  DeepSeek = "DeepSeek",
  Panda = "Panda",
  // Claude = "Claude",
  // GeminiPro = "GeminiPro",
}

export enum ModelProvider {
  GPT = "GPT",
  DeepSeek = "DeepSeek",
  Panda = "Panda",
  // Claude = "Claude",
  // GeminiPro = "GeminiPro",
}

export const OpenaiPath = {
  ChatPath: "v1/chat/completions",
  ImagePath: "v1/images/generations",
  UsagePath: "dashboard/billing/usage",
  SubsPath: "dashboard/billing/subscription",
  ListModelPath: "v1/models",
};

export const PandaPath = {
  ChatPath: "v1/chat/completions",
  ListModelPath: "v1/models",
};

// export const ClaudePath = {
//   ChatPath: "v1/messages",
//   UsagePath: "v1/usage",
//   ListModelPath: "v1/models",
// };

// export const GeminiProPath = {
//   ChatPath: "v1beta/models/gemini-pro:generateContent",
//   VisionPath: "v1beta/models/gemini-pro-vision:generateContent",
//   ListModelPath: "v1beta/models",
// };

export const REQUEST_TIMEOUT_MS = 60000;
export const STORAGE_KEY = "chatgpt-next-web";

// Keep these for future use
export enum StoreKey {
  Chat = "chat-next-web-store",
  Config = "app-config",
}
