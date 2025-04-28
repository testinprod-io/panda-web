// azure and openai, using same models. so using same LLMApi.
import { ApiPath, DEEPSEEK_BASE_URL } from "@/app/constant";
import { useAccessStore } from "@/app/store";
import { ChatOptions, getHeaders, LLMApi, LLMModel, LLMUsage, getBearerToken } from "../api";

export class DeepSeekApi implements LLMApi {
  private disableListModels = true;

  path(path: string): string {
    const accessStore = useAccessStore.getState();
    let baseUrl = DEEPSEEK_BASE_URL;
    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.deepseekUrl;
    }
    if (baseUrl.length === 0) {
      const isApp = false; // !!getClientConfig()?.isApp;
      const apiPath = ApiPath.DeepSeek;
      baseUrl = isApp ? DEEPSEEK_BASE_URL : apiPath;
    }
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }
    if (!baseUrl.startsWith("http") && !baseUrl.startsWith(ApiPath.DeepSeek)) {
      baseUrl = "https://" + baseUrl;
    }
    console.log("[DeepSeek Endpoint] ", baseUrl, path);
    return [baseUrl, path].join("/");
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions) {
    const messages = options.messages.map((v) => ({
      role: v.role,
      content: v.content,
    }));

    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const response = await fetch(this.path("/chat/completions"), {
        method: "POST",
        headers: {
          ...getHeaders(),
          Authorization: getBearerToken(process.env.DEEPSEEK_API_KEY || ""),
        },
        body: JSON.stringify({
          model: options.config.model,
          messages,
          temperature: options.config.temperature ?? 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let responseText = "";
      let timestamp = new Date();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\\n").filter((line) => line.trim());

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
            console.error("[Request] parse error", line);
          }
        }
      }

      options.onFinish(responseText, timestamp, response);
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
    return [
      {
        name: "deepseek-chat",
        displayName: "DeepSeek Chat",
        available: true,
        provider: {
          id: "deepseek",
          providerName: "DeepSeek",
          providerType: "deepseek",
          sorted: 2,
        },
        sorted: 1,
      },
    ];
  }
}
