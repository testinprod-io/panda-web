import { OPENAI_BASE_URL, OpenaiPath } from "@/app/constant";
import { uploadImage, base64Image2Blob } from "@/app/utils/chat";
import {
  ChatOptions,
  getHeaders,
  LLMApi,
  LLMModel,
  LLMUsage,
  MultimodalContent,
  getBearerToken,
} from "@/app/client/api";

export interface OpenAIListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    root: string;
  }>;
}

export interface RequestPayload {
  messages: {
    role: "system" | "user" | "assistant";
    content: string | MultimodalContent[];
  }[];
  stream?: boolean;
  model: string;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export class ChatGPTApi implements LLMApi {
  private disableListModels = true;

  // path(path: string): string {
  //   const accessStore = useAccessStore.getState();
  //   let baseUrl = "";
  //   const isAzure = path.includes("deployments");
  //   if (accessStore.useCustomConfig) {
  //     if (isAzure && !accessStore.isValidAzure()) {
  //       throw Error(
  //         "incomplete azure config, please check it in your settings page",
  //       );
  //     }
  //     baseUrl = isAzure ? accessStore.azureUrl : accessStore.openaiUrl;
  //   }
  //   if (baseUrl.length === 0) {
  //     const isApp = !!getClientConfig()?.isApp;
  //     const apiPath = isAzure ? ApiPath.Azure : ApiPath.OpenAI;
  //     baseUrl = isApp ? OPENAI_BASE_URL : apiPath;
  //   }
  //   if (baseUrl.endsWith("/")) {
  //     baseUrl = baseUrl.slice(0, baseUrl.length - 1);
  //   }
  //   if (!baseUrl.startsWith("http") && !isAzure && !baseUrl.startsWith(ApiPath.OpenAI)) {
  //     baseUrl = "https://" + baseUrl;
  //   }
  //   console.log("[Proxy Endpoint] ", baseUrl, path);
  //   return cloudflareAIGatewayUrl([baseUrl, path].join("/"));
  // }

  async extractMessage(res: any) {
    if (res.error) {
      return "```\n" + JSON.stringify(res, null, 4) + "\n```";
    }
    if (res.data) {
      let url = res.data?.at(0)?.url ?? "";
      const b64_json = res.data?.at(0)?.b64_json ?? "";
      if (!url && b64_json) {
        url = await uploadImage(base64Image2Blob(b64_json, "image/png"));
      }
      return [
        {
          type: "image_url",
          image_url: {
            url,
          },
        },
      ];
    }
    return res.choices?.at(0)?.message?.content ?? res;
  }

  async chat(options: ChatOptions) {
    const messages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    options.onController?.(controller);

    try {
    // Use our API route instead of direct OpenAI API call
    const response = await fetch('/api/openai', {
      method: "POST",
        headers: {
          ...getHeaders(),
          "Authorization": getBearerToken(process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""),
        },
        body: JSON.stringify({
          model: options.config.model,
          messages,
          temperature: options.config.temperature ?? 0.7,
          stream: options.config.stream ?? true,
        }),
        signal: controller.signal,
      });

      const decoder = new TextDecoder();
      if (options.config.stream) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body available for streaming");
        }

        let responseText = "";
        let timestamp = new Date();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          // Split by newlines and filter out empty lines
          const lines = text.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content;
              timestamp = new Date(json.timestamp);
              if (!content) continue;

              responseText += content;
              options.onUpdate?.(responseText, content);
            } catch (e) {
              console.log("[Request] parse error", line);
            }
          }
        }
    
        options.onFinish(responseText, timestamp, response);
      } else {
        // Handle non-streaming response
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }
        const jsonResponse = await response.json();
        console.log("[Request] Non-streaming JSON response:", jsonResponse);
        const messageContent = jsonResponse.choices?.[0]?.message?.content;

        if (typeof messageContent === 'string') {
            console.log("[Request] Extracted non-streaming message:", messageContent);
            options.onFinish(messageContent, new Date(jsonResponse.timestamp), response);
        } else {
            console.error("[Request] Could not extract message content from non-streaming response:", jsonResponse);
            throw new Error("Could not extract message content from non-streaming response.");
        }
      } 
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
      // return DEFAULT_MODELS.slice();
      return [{
        name: "gpt-3.5-turbo",
        available: true,
        sorted: 1000,
        provider: {
          id: "openai",
          providerName: "OpenAI",
          providerType: "openai",
          sorted: 1,
        },
      }];
    }

    const res = await fetch(`${OPENAI_BASE_URL}/${OpenaiPath.ListModelPath}`, {
      method: "GET",
      headers: {
        ...getHeaders(),
      },
    });

    const resJson = (await res.json()) as OpenAIListModelResponse;
    const chatModels = resJson.data?.filter(
      (m) => m.id.startsWith("gpt-") || m.id.startsWith("chatgpt-"),
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
        id: "openai",
        providerName: "OpenAI",
        providerType: "openai",
        sorted: 1,
      },
    }));
  }
}
export { OpenaiPath };
