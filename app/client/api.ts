import { ModelProvider, ServiceProvider } from "@/app/constant";
import { ModelType } from "@/app/store";
import { ChatMessage } from "@/app/types";
import { ChatGPTApi } from "@/app/client/platforms/openai";
import { DeepSeekApi } from "@/app/client/platforms/deepseek";
import { PandaApi, GetAccessTokenFn } from "@/app/client/platforms/panda";

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export type ChatModel = ModelType;

export interface MultimodalContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
}

export interface LLMConfig {
  model: string;
  providerName?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;
  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string, responseRes: Response) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export interface LLMUsage {
  used: number;
  total: number;
}

export interface LLMModel {
  name: string;
  displayName?: string;
  available: boolean;
  provider: LLMModelProvider;
  sorted: number;
}

export interface LLMModelProvider {
  id: string;
  providerName: string;
  providerType: string;
  sorted: number;
}

export abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}

export class ClientApi {
  public llm: LLMApi;

  constructor(provider: ModelProvider = ModelProvider.GPT, getAccessToken?: GetAccessTokenFn) {
    switch (provider) {
      case ModelProvider.DeepSeek:
        this.llm = new DeepSeekApi();
        break;
      case ModelProvider.Panda:
        if (!getAccessToken) {
          throw new Error("getAccessToken function is required for Panda provider");
        }
        this.llm = new PandaApi(getAccessToken);
        break;
      default:
        this.llm = new ChatGPTApi();
    }
  }

  async share(messages: ChatMessage[], avatarUrl: string | null = null) {
    const msgs = messages.map((m) => ({
      from: m.role === "user" ? "human" : "gpt",
      value: m.content,
    }));
    return msgs;
  }
}

export function getBearerToken(apiKey: string): string {
  return apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;
}

export function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-requested-with": "XMLHttpRequest",
  };
}

export function getClientApi(provider: ServiceProvider, getAccessToken: GetAccessTokenFn): ClientApi {
  switch (provider) {
    case ServiceProvider.DeepSeek:
      return new ClientApi(ModelProvider.DeepSeek);
    case ServiceProvider.Panda:
      return new ClientApi(ModelProvider.Panda, getAccessToken);
    default:
      return new ClientApi(ModelProvider.GPT);
  }
}
