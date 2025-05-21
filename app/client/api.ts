import { ModelConfig, ModelProvider, ServiceProvider } from "@/app/constant";
import { ModelType } from "@/app/store";
import { ChatMessage } from "@/app/types";
import { PandaApi, GetAccessTokenFn } from "@/app/client/platforms/panda";
import { ApiClient } from "@/app/client/client";
import { SummaryResponse } from "@/app/client/platforms/panda";

export const ROLES = ["system", "user"] as const;
export type MessageRole = (typeof ROLES)[number];

export type ChatModel = ModelType;

export interface MultimodalContent {
  type: "text" | "image_url" | "pdf_url";
  text?: string;
  image_url?: {
    url: string;
  };
  pdf_url?: {
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
  reasoning?: boolean;
  targetEndpoint?: string;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;
  onReasoningStart?: (messageId?: string) => void;
  onReasoningChunk?: (messageId: string | undefined, chunk: string) => void;
  onReasoningEnd?: (messageId?: string) => void;
  onContentChunk?: (messageId: string | undefined, chunk: string) => void;
  onFinish: (message: string, date: Date, responseRes: Response) => void;
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
  abstract summary(config: LLMConfig, messages: RequestMessage[], maxTokens: number): Promise<SummaryResponse>;
}

export class ClientApi {
  public llm: LLMApi;
  public app: ApiClient;

  constructor(
    provider: ModelProvider = ModelProvider.Panda,
    getAccessToken?: GetAccessTokenFn
  ) {
    if (!getAccessToken) {
      throw new Error("getAccessToken function is required for Panda provider");
    }
    const defaultPandaBaseUrl = ""; // Or a more sensible default like from an env var or appConfig
    this.llm = new PandaApi(defaultPandaBaseUrl, getAccessToken);
    this.app = new ApiClient("http://3.15.240.252:8000", getAccessToken);
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

export function getClientApi(
  provider: ServiceProvider,
  getAccessToken: GetAccessTokenFn
): ClientApi {
  return new ClientApi(ModelProvider.Panda, getAccessToken);
}
