import { AiGatewayError } from '../errors';
import type { CompletionRequest, CompletionResult } from '../types';
import type { ModelAdapter } from './types';

export interface OllamaAdapterOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Local Ollama chat adapter (privacy-sensitive workloads).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaAdapter implements ModelAdapter {
  readonly provider = 'ollama' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaAdapterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:11434').replace(
      /\/$/,
      '',
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const body = {
      model: request.model,
      messages: request.messages,
      stream: false,
      format: request.responseFormat === 'json' ? 'json' : undefined,
      options: {
        temperature: request.temperature ?? 0.2,
      },
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new AiGatewayError(
        'PROVIDER_ERROR',
        `Ollama request failed: ${cause instanceof Error ? cause.message : String(cause)}. Is Ollama running at ${this.baseUrl}?`,
        { provider: 'ollama', cause },
      );
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: { content?: string };
      model?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    if (!response.ok) {
      throw new AiGatewayError(
        'PROVIDER_ERROR',
        `Ollama HTTP ${response.status}: ${payload.error ?? response.statusText}`,
        { provider: 'ollama' },
      );
    }

    const text = payload.message?.content?.trim();
    if (!text) {
      throw new AiGatewayError(
        'PROVIDER_ERROR',
        'Ollama returned an empty completion',
        { provider: 'ollama' },
      );
    }

    return {
      text,
      model: payload.model ?? request.model,
      provider: 'ollama',
      usage: {
        promptTokens: payload.prompt_eval_count,
        completionTokens: payload.eval_count,
        totalTokens:
          payload.prompt_eval_count != null && payload.eval_count != null
            ? payload.prompt_eval_count + payload.eval_count
            : undefined,
      },
    };
  }
}
