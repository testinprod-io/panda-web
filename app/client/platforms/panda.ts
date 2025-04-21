import { PANDA_BASE_URL, PandaPath } from "@/app/constant";
import { ChatOptions, LLMApi, LLMModel, LLMUsage, MultimodalContent } from "@/app/client/api";

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
    role: "system" | "user" | "assistant";
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

export class PandaApi implements LLMApi {
  private baseUrl: string = PANDA_BASE_URL;
  private disableListModels: boolean = false;
  private getAccessToken: GetAccessTokenFn;

  constructor(getAccessToken: GetAccessTokenFn, disableListModels?: boolean) {
    this.getAccessToken = getAccessToken;
    if (disableListModels) {
      this.disableListModels = disableListModels;
    }
  }

  path(path: string): string {
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, this.baseUrl.length - 1);
    }
    console.log("[Panda Endpoint] ", this.baseUrl, path);
    return [this.baseUrl, path].join("/");
  }

  async chat(options: ChatOptions) {
    const messages = options.messages.map((v) => ({
      role: v.role,
      content: v.content,
    }));

    const controller = new AbortController();
    options.onController?.(controller);

    try {
      // Get the access token
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error("Panda API requires authentication. Access token not available.");
      }
      const bearerToken = `Bearer ${accessToken}`;

      const requestUrl = this.path(PandaPath.ChatPath);
      console.log("[Panda Request] Sending request to:", requestUrl);
      console.log("[Panda Request] Headers:", {
        "Content-Type": "application/json",
        "Authorization": bearerToken,
        "Accept": "text/event-stream",
      });
      console.log("[Panda Request] Body:", {
        model: options.config.model,
        messages,
        temperature: options.config.temperature ?? 0.7,
        stream: options.config.stream ?? true,
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": bearerToken,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          model: options.config.model,
          messages,
          temperature: options.config.temperature ?? 0.7,
          stream: options.config.stream ?? true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Panda Error] Response not OK:", response.status, response.statusText);
        console.error("[Panda Error] Response body:", errorText);
        throw new Error(`Panda API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let responseText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        console.log("[Panda Response] Chunk:", text);
        
        // Split by newlines and filter out empty lines
        const lines = text.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content;
            if (!content) continue;

            responseText += content;
            options.onUpdate?.(responseText, content);
          } catch (e) {
            console.error("[Request] parse error", line);
          }
        }
      }

      options.onFinish(responseText, response);
    } catch (error: any) {
      console.error("[Request] failed", error);
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
          name: "deepseek-ai/deepseek-coder-1.3b-instruct",
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
          name: "deepseek-ai/deepseek-coder-6.7b-instruct",
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
          name: "deepseek-ai/deepseek-coder-33b-instruct",
          available: true,
          sorted: 1002,
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
      // Get the access token
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.error("[Models] Panda API requires authentication. Access token not available.");
        // Return empty or default models if token is not available
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
        (m) => m.id.startsWith("deepseek-ai/"),
      );
      console.log("[Models]", chatModels);

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
      console.error("[Models] failed to fetch models", error);
      return [];
    }
  }
} 