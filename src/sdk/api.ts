import { AppServer } from "./client/app-server";
import { LLMServer } from "./client/llm-server";
import { GetAccessTokenFn } from "./client/types";

export class ApiService {
  public readonly app: AppServer;
  public readonly llm: LLMServer;

  constructor(getAccessToken: GetAccessTokenFn) {
    if (!getAccessToken) {
      throw new Error("ApiService requires a getAccessToken function to be provided during construction.");
    }
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_SERVER_ENDPOINT || "";
    
    this.app = new AppServer(appBaseUrl, getAccessToken);
    this.llm = new LLMServer(appBaseUrl, getAccessToken);
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

export function getClientApi(getAccessToken: GetAccessTokenFn): ApiService {
  return new ApiService(getAccessToken);
}
