import { PandaPath, DEFAULT_PANDA_MODEL_NAME } from "@/types/constant";
import { ChatOptions, LLMApi, LLMModel, LLMUsage, MultimodalContent, LLMConfig } from "@/client/api";
import { RequestMessage, Role, CustomizedPromptsData } from "@/types";

// Type for the Privy getAccessToken function
export type GetAccessTokenFn = () => Promise<string | null>;

export interface PandaListModelResponse {
  data: {
    id: string;
    object: string;
    owned_by: string;
    permission: any[];
    root: string;
    parent: null;
  }[];
  object: string;
}

export interface RequestPayload {
  messages: {
    role: Role;
    content: string | MultimodalContent[];
  }[];
  stream?: boolean;
  model: string;
  temperature: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export interface SummaryResponse {
  summary: string;
}

export class PandaApi implements LLMApi {
  private baseUrl: string;
  private disableListModels: boolean = false;
  private getAccessToken: GetAccessTokenFn;

  constructor(baseUrl: string, getAccessToken: GetAccessTokenFn, disableListModels?: boolean) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
    if (disableListModels) {
      this.disableListModels = disableListModels;
    }
  }

  path(path: string, targetEndpoint?: string): string {
    const baseUrlToUse = targetEndpoint || this.baseUrl;
    // Ensure no double slashes and handle if baseUrlToUse is empty
    const A = baseUrlToUse.endsWith("/") ? baseUrlToUse.slice(0, -1) : baseUrlToUse;
    const B = path.startsWith("/") ? path.slice(1) : path;
    const finalPath = `${A}/${B}`;
    console.log("[Panda Endpoint Used] ", finalPath);
    return finalPath;
  }

  
  async chat(options: ChatOptions) {
    let messages = options.messages.map((v) => ({
      role: v.role,
      content: v.attachments ? [...v.attachments, { type: "text", text: v.content }] : v.content,
    }));

    if (options.config.customizedPrompts && options.config.customizedPrompts.enabled) {
      const systemPrompt = generateSystemPrompt(options.config.customizedPrompts);
      messages = [
        {
          role: Role.SYSTEM,
          content: systemPrompt,
        },
        ...messages,
      ];
    }

    const controller = new AbortController();
    options.onController?.(controller);

    let inReasoningPhase = false;
    let reasoningStartedForThisMessage = false;
    let mainContentText = "";
    let timestamp = new Date();
    const usePdf = messages.some((v) => Array.isArray(v.content) && v.content.some((c) => c.type === "pdf_url"));

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error("Panda API requires authentication. Access token not available.");
      }
      const bearerToken = `Bearer ${accessToken}`;

      // Use targetEndpoint from options.config if available, otherwise default to this.baseUrl via this.path
      const requestUrl = this.path(PandaPath.ChatPath, options.config.targetEndpoint);
      
      const requestBody = {
        model: options.config.model,
        messages,
        temperature: options.config.temperature ?? 0.7,
        stream: options.config.stream ?? true,
        reasoning: options.config.reasoning ?? false,
        use_pdf: usePdf,
        use_search: options.config.useSearch ?? false,
      };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": bearerToken,
          "Accept": requestBody.stream ? "text/event-stream" : "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Panda Error] Response not OK:", response.status, response.statusText);
        console.error("[Panda Error] Response body:", errorText);
        throw new Error(`Panda API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (requestBody.stream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body for streaming");
        }

        mainContentText = ""; 
        timestamp = new Date();
        inReasoningPhase = false;
        reasoningStartedForThisMessage = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n").filter((line) => line.trim().startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              if (inReasoningPhase) {
                options.onReasoningEnd?.(undefined);
                inReasoningPhase = false;
              }
              break;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices[0]?.delta;
              timestamp = json.created ? new Date(json.created * 1000) : (json.timestamp ? new Date(json.timestamp) : new Date());
              if (!delta) continue;
              const reasoningContent = delta.reasoning_content;
              const mainResponseContent = delta.content;
              if (reasoningContent) {
                if (!reasoningStartedForThisMessage) {
                  options.onReasoningStart?.(undefined);
                  reasoningStartedForThisMessage = true;
                  inReasoningPhase = true;
                }
                options.onReasoningChunk?.(undefined, reasoningContent);
              } else if (mainResponseContent) {
                if (inReasoningPhase) {
                  options.onReasoningEnd?.(undefined);
                  inReasoningPhase = false;
                }
                mainContentText += mainResponseContent;
                options.onContentChunk?.(undefined, mainResponseContent);
              }
            } catch (e) {
              console.error("[Panda Request] stream parse error", line, e);
            }
          }
          if (text.includes("[DONE]")) break; 
        }
        if (inReasoningPhase) {
          options.onReasoningEnd?.(undefined);
        }
        options.onFinish(mainContentText, timestamp, response);
      } else {
        const jsonResponse = await response.json();
        timestamp = jsonResponse.created ? new Date(jsonResponse.created * 1000) : (jsonResponse.timestamp ? new Date(jsonResponse.timestamp) : new Date());

        const message = jsonResponse.choices?.[0]?.message;
        const finalReasoning = message.reasoning_content as string | undefined;
        const finalContent = message.content as string | undefined;

        if (finalReasoning) {
          options.onReasoningStart?.(undefined);
          options.onReasoningChunk?.(undefined, finalReasoning);
          options.onReasoningEnd?.(undefined);
        }
        
        const mainMessageToFinish = finalContent || "";
        options.onContentChunk?.(undefined, mainMessageToFinish);
        options.onFinish(mainMessageToFinish, timestamp, response);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("[Panda Request] failed", error);
      }
      if (inReasoningPhase) {
        options.onReasoningEnd?.(undefined);
      }
      options.onError?.(error);
    }
  }

  async usage(): Promise<LLMUsage> {
    return {
      used: 0,
      total: 0,
    };
  }

  async models(): Promise<LLMModel[]> {
    if (this.disableListModels) {
      return [
        {
          name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
          available: true,
          sorted: 1000,
          provider: {
            id: "panda",
            providerName: "Panda",
            providerType: "panda",
            sorted: 1,
          },
        },
        {
          name: "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16",
          available: true,
          sorted: 1001,
          provider: {
            id: "panda",
            providerName: "Panda",
            providerType: "panda",
            sorted: 1,
          },
        },
        {
          name: "deepseek-ai/deepseek-coder-6.7b-instruct",
          available: true,
          sorted: 1002,
          provider: {
            id: "panda",
            providerName: "Panda",
            providerType: "panda",
            sorted: 1,
          },
        },
        {
          name: "deepseek-ai/deepseek-coder-33b-instruct",
          available: true,
          sorted: 1003,
          provider: {
            id: "panda",
            providerName: "Panda",
            providerType: "panda",
            sorted: 1,
          },
        }
      ];
    }

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.error("[Models] Panda API requires authentication. Access token not available.");
        return [];
      }
      const bearerToken = `Bearer ${accessToken}`;

      const requestUrl = this.path(PandaPath.ListModelPath);
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          "Authorization": bearerToken,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Panda API error fetching models: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const resJson = (await response.json()) as PandaListModelResponse;
      const chatModels = resJson.data?.filter(
        (m) => m.id.startsWith("deepseek-ai/"), // Example filter, adjust if Panda uses different model naming
      );
      console.log("[Models] Panda models found:", chatModels);

      if (!chatModels) {
        return [];
      }

      let seq = 1000;
      return chatModels.map((m) => ({
        name: m.id,
        available: true,
        sorted: seq++,
        provider: {
          id: "panda",
          providerName: "Panda",
          providerType: "panda",
          sorted: 1,
        },
      }));
    } catch (error) {
      console.error("[Models] Panda: failed to fetch models", error);
      return []; // Return empty or default models on error
    }
  }

  async summary(config: LLMConfig, messages: RequestMessage[], maxTokens: number = 1000): Promise<SummaryResponse> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error("Panda API requires authentication. Access token not available.");
      }
      const bearerToken = `Bearer ${accessToken}`;

      const requestUrl = this.path(PandaPath.SummaryPath, config.targetEndpoint);
      
      const requestBody = {
        model: DEFAULT_PANDA_MODEL_NAME,
        messages,
        temperature: 0.2, // Hard-coded as specified
        max_tokens: maxTokens,
        stream: false, // Summary endpoint doesn't support streaming
      };

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": bearerToken,
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Panda Error] Summary response not OK:", response.status, response.statusText);
        console.error("[Panda Error] Summary response body:", errorText);
        throw new Error(`Panda API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as SummaryResponse;
      return data;
    } catch (error: any) {
      console.error("[Panda Request] Summary failed", error);
      throw error;
    }
  }
} 

function generateSystemPrompt(data: CustomizedPromptsData): string {
  const name = data.personal_info?.name || "User";
  const job = data.personal_info?.job || "individual";
  const traits = data.prompts?.traits || "Neutral";
  const extra = data.prompts?.extra_params || "";

  return `You are assisting ${name}, who is ${job}. When responding, adapt your tone and approach to suit someone who appreciates the following traits: ${traits}. ${extra.trim() ? `Also, ${extra}` : ""}`.trim();
}
