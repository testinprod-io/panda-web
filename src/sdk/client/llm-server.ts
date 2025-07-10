import { PandaPath, DEFAULT_PANDA_MODEL_NAME } from "@/types/constant";
import {
  ChatOptions,
  MultimodalContent,
  LLMConfig,
  RequestMessage,
  GetAccessTokenFn,
} from "@/sdk/client/types";
import { Role } from "@/types";
import {
  generateChallengeHeaders,
  verifyChallenge,
  ChallengeResponse,
} from "@/sdk/client/panda-challenge";

export interface RequestPayload {
  messages: {
    role: Role;
    content: string | MultimodalContent[];
  }[];
  stream?: boolean;
  model: string;
  temperature: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export interface SummaryResponse {
  summary: string;
  challengeResponse: ChallengeResponse;
}

export class LLMServer {
  private baseUrl: string;
  private getAccessToken: GetAccessTokenFn;

  constructor(
    baseUrl: string,
    getAccessToken: GetAccessTokenFn,
  ) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
  }

  path(path: string, targetEndpoint?: string): string {
    const baseUrlToUse = targetEndpoint || this.baseUrl;
    // Ensure no double slashes and handle if baseUrlToUse is empty
    const A = baseUrlToUse.endsWith("/")
      ? baseUrlToUse.slice(0, -1)
      : baseUrlToUse;
    const B = path.startsWith("/") ? path.slice(1) : path;
    const finalPath = `${A}/${B}`;
    console.log("[Panda Endpoint Used] ", finalPath);
    return finalPath;
  }

  async chat(options: ChatOptions) {
    let messages = options.messages.map((v, i) => ({
      role: v.role,
      content: (v.attachments && i === options.messages.length - 1)
        ? [...v.attachments, { type: "text", text: v.content }]
        : v.content,
    }));

    if (options.config.customizedPrompts && options.config.customizedPrompts !== "") {
      messages = [
        {
          role: Role.SYSTEM,
          content: options.config.customizedPrompts,
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
    const lastMessage = messages[messages.length - 1];
    const usePdf = Array.isArray(lastMessage.content) && lastMessage.content.some((c) => c.type === "pdf_url");

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error(
          "Panda API requires authentication. Access token not available.",
        );
      }
      const bearerToken = `Bearer ${accessToken}`;

      // Use targetEndpoint from options.config if available, otherwise default to this.baseUrl via this.path
      const requestUrl = this.path(
        PandaPath.ChatPath,
        options.config.targetEndpoint,
      );

      const requestBody = {
        model: options.config.model,
        messages,
        temperature: options.config.temperature ?? 0.7,
        stream: options.config.stream ?? true,
        reasoning: options.config.reasoning ?? false,
        use_pdf: usePdf,
        use_search: options.config.useSearch ?? false,
      };

      const { challenge, headers: challengeHeaders } = generateChallengeHeaders();

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerToken,
          Accept: requestBody.stream ? "text/event-stream" : "application/json",
          ...challengeHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[Panda Error] Response not OK:",
          response.status,
          response.statusText,
        );
        console.error("[Panda Error] Response body:", errorText);
        throw new Error(
          `Panda API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
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
          const lines = text
            .split("\n")
            .filter((line) => line.trim().startsWith("data: "));

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
              timestamp = json.created
                ? new Date(json.created * 1000)
                : json.timestamp
                  ? new Date(json.timestamp)
                  : new Date();
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
        const challengeResponse = verifyChallenge(response, challenge);
        options.onFinish(mainContentText, timestamp, response, challengeResponse);
      } else {
        const jsonResponse = await response.json();
        timestamp = jsonResponse.created
          ? new Date(jsonResponse.created * 1000)
          : jsonResponse.timestamp
            ? new Date(jsonResponse.timestamp)
            : new Date();

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
        const challengeResponse = verifyChallenge(response, challenge);
        options.onFinish(mainMessageToFinish, timestamp, response, challengeResponse);
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

  async summary(
    config: LLMConfig,
    messages: RequestMessage[],
    maxTokens: number = 1000,
  ): Promise<SummaryResponse> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error(
          "Panda API requires authentication. Access token not available.",
        );
      }
      const bearerToken = `Bearer ${accessToken}`;

      const messagesToSummarize = messages.map((v) => ({
        role: v.role,
        content: v.attachments
          ? [...v.attachments, { type: "text", text: v.content }]
          : v.content,
      }));

      const requestUrl = this.path(
        PandaPath.SummaryPath,
        config.targetEndpoint,
      );

      const requestBody = {
        model: DEFAULT_PANDA_MODEL_NAME,
        messages: messagesToSummarize,
        temperature: 0.2, // Hard-coded as specified
        max_tokens: maxTokens,
        stream: false, // Summary endpoint doesn't support streaming
      };

      const { challenge, headers: challengeHeaders } = generateChallengeHeaders();

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerToken,
          Accept: "application/json",
          ...challengeHeaders,
        },
        body: JSON.stringify(requestBody),
      });

      const challengeResponse = verifyChallenge(response, challenge);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[Panda Error] Summary response not OK:",
          response.status,
          response.statusText,
        );
        console.error("[Panda Error] Summary response body:", errorText);
        throw new Error(
          `Panda API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as SummaryResponse;
      return {
        ...data,
        challengeResponse,
      };
    } catch (error) {
      console.error("[Panda Request] Summary failed", error);
      throw error;
    }
  }
}