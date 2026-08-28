import { AiGatewayError } from "../errors";
import type { CompletionRequest, CompletionResult } from "../types";
import type { ModelAdapter } from "./types";

export interface OpenRouterAdapterOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

/**
 * OpenRouter chat-completions adapter (OpenAI-compatible HTTP API).
 * @see https://openrouter.ai/docs
 */
export class OpenRouterAdapter implements ModelAdapter {
  readonly provider = "openrouter" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: OpenRouterAdapterOptions) {
    if (!options.apiKey?.trim()) {
      throw new AiGatewayError(
        "CONFIG_ERROR",
        "OPENROUTER_API_KEY is required for OpenRouterAdapter",
        { provider: "openrouter" },
      );
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://openrouter.ai/api/v1").replace(
      /\/$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
    };

    if (request.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...this.defaultHeaders,
        },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new AiGatewayError(
        "PROVIDER_ERROR",
        `OpenRouter request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        { provider: "openrouter", cause },
      );
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    if (!response.ok) {
      throw new AiGatewayError(
        "PROVIDER_ERROR",
        `OpenRouter HTTP ${response.status}: ${payload.error?.message ?? response.statusText}`,
        { provider: "openrouter" },
      );
    }

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new AiGatewayError(
        "PROVIDER_ERROR",
        "OpenRouter returned an empty completion",
        { provider: "openrouter" },
      );
    }

    return {
      text,
      model: payload.model ?? request.model,
      provider: "openrouter",
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          }
        : undefined,
    };
  }
}
