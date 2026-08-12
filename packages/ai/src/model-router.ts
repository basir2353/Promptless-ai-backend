import { OllamaAdapter } from './adapters/ollama';
import { OpenRouterAdapter } from './adapters/openrouter';
import { StubAdapter } from './adapters/stub';
import type { ModelAdapter } from './adapters/types';
import { AiGatewayError } from './errors';
import {
  parseGeneratedSuggestion,
  SUGGESTION_SYSTEM_PROMPT,
} from './parse-suggestion';
import type {
  CompletionResult,
  GenerateInput,
  GenerateSuggestionResult,
  ModelRouterConfig,
  RouteDecision,
  TaskComplexity,
} from './types';

const DEFAULT_COMPLEX_MODEL = 'openai/gpt-4o';
const DEFAULT_SIMPLE_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_OLLAMA_MODEL = 'llama3';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';

function formatContext(context: GenerateInput['context']): string {
  if (context == null) return '';
  if (typeof context === 'string') return context.trim();
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return String(context);
  }
}

function envFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Section 15 — AI Gateway & Model Router.
 *
 * Routing:
 * - isSensitive === true  → local Ollama (Llama 3)
 * - COMPLEX               → OpenRouter (GPT-4o / Claude 3.5 Sonnet)
 * - SIMPLE                → OpenRouter (GPT-4o-mini / Haiku-class)
 */
export class ModelRouter {
  private readonly config: Required<
    Pick<
      ModelRouterConfig,
      | 'openRouterComplexModel'
      | 'openRouterSimpleModel'
      | 'ollamaBaseUrl'
      | 'ollamaModel'
      | 'temperature'
    >
  > &
    ModelRouterConfig;

  private openRouter?: ModelAdapter;
  private ollama: ModelAdapter;
  private readonly stubMode: boolean;

  constructor(config: ModelRouterConfig = {}) {
    this.config = {
      ...config,
      openRouterComplexModel:
        config.openRouterComplexModel ?? DEFAULT_COMPLEX_MODEL,
      openRouterSimpleModel:
        config.openRouterSimpleModel ?? DEFAULT_SIMPLE_MODEL,
      ollamaBaseUrl: config.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL,
      ollamaModel: config.ollamaModel ?? DEFAULT_OLLAMA_MODEL,
      temperature: config.temperature ?? 0.2,
    };

    this.stubMode = Boolean(config.stub);

    if (this.stubMode) {
      this.ollama = new StubAdapter('ollama');
      this.openRouter = new StubAdapter('openrouter');
    } else {
      this.ollama = new OllamaAdapter({
        baseUrl: this.config.ollamaBaseUrl,
        fetchImpl: this.config.fetchImpl,
      });

      if (this.config.openRouterApiKey) {
        this.openRouter = new OpenRouterAdapter({
          apiKey: this.config.openRouterApiKey,
          baseUrl: this.config.openRouterBaseUrl,
          fetchImpl: this.config.fetchImpl,
        });
      }
    }
  }

  /** Create a router from process environment variables. */
  static fromEnv(
    env: Record<string, string | undefined> = process.env,
    overrides: ModelRouterConfig = {},
  ): ModelRouter {
    return new ModelRouter({
      openRouterApiKey: env.OPENROUTER_API_KEY,
      openRouterBaseUrl: env.OPENROUTER_BASE_URL,
      openRouterComplexModel:
        env.OPENROUTER_COMPLEX_MODEL ??
        env.AI_COMPLEX_MODEL ??
        DEFAULT_COMPLEX_MODEL,
      openRouterSimpleModel:
        env.OPENROUTER_SIMPLE_MODEL ??
        env.AI_SIMPLE_MODEL ??
        DEFAULT_SIMPLE_MODEL,
      ollamaBaseUrl: env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_URL,
      ollamaModel: env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
      temperature: env.AI_TEMPERATURE
        ? Number(env.AI_TEMPERATURE)
        : undefined,
      stub: envFlag(env.AI_STUB),
      ...overrides,
    });
  }

  /**
   * Decide provider + model without calling the network.
   * Sensitive traffic always stays on local Ollama.
   */
  decideRoute(
    complexity: TaskComplexity,
    isSensitive: boolean,
  ): RouteDecision {
    if (isSensitive) {
      return {
        provider: 'ollama',
        model: this.config.ollamaModel,
        reason: 'isSensitive=true → local Ollama (privacy)',
      };
    }

    if (complexity === 'COMPLEX') {
      return {
        provider: 'openrouter',
        model: this.config.openRouterComplexModel,
        reason: "complexity=COMPLEX → OpenRouter (GPT-4o / Claude 3.5 Sonnet)",
      };
    }

    if (complexity === 'SIMPLE') {
      return {
        provider: 'openrouter',
        model: this.config.openRouterSimpleModel,
        reason:
          "complexity=SIMPLE → OpenRouter lightweight model (GPT-4o-mini / Haiku)",
      };
    }

    throw new AiGatewayError(
      'ROUTING_ERROR',
      `Unsupported complexity: ${String(complexity)}`,
    );
  }

  /** Low-level completion with routing applied. */
  async generate(input: GenerateInput): Promise<CompletionResult & { route: RouteDecision }> {
    this.assertValidInput(input);
    const route = this.decideRoute(input.complexity, input.isSensitive);
    const adapter = this.resolveAdapter(route.provider);
    const contextBlock = formatContext(input.context);

    const userContent = contextBlock
      ? `${input.prompt.trim()}\n\nContext:\n${contextBlock}`
      : input.prompt.trim();

    const completion = await adapter.complete({
      model: route.model,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Follow the user instructions carefully.',
        },
        { role: 'user', content: userContent },
      ],
    });

    return { ...completion, route };
  }

  /**
   * Generate a structured Suggestion JSON object via the routed model.
   */
  async generateSuggestion(
    input: GenerateInput,
  ): Promise<GenerateSuggestionResult> {
    this.assertValidInput(input);
    const route = this.decideRoute(input.complexity, input.isSensitive);
    const adapter = this.resolveAdapter(route.provider);
    const contextBlock = formatContext(input.context);

    const userContent = [
      input.prompt.trim(),
      contextBlock ? `Context:\n${contextBlock}` : '',
      'Return only the Suggestion JSON object.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const completion = await adapter.complete({
      model: route.model,
      temperature: this.config.temperature,
      responseFormat: 'json',
      messages: [
        { role: 'system', content: SUGGESTION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const suggestion = parseGeneratedSuggestion(completion.text);

    return {
      suggestion,
      rawText: completion.text,
      route,
      model: completion.model,
      provider: completion.provider,
    };
  }

  private resolveAdapter(provider: RouteDecision['provider']): ModelAdapter {
    if (provider === 'ollama') {
      return this.ollama;
    }

    if (!this.openRouter) {
      throw new AiGatewayError(
        'CONFIG_ERROR',
        'OPENROUTER_API_KEY is not configured but routing selected OpenRouter',
        { provider: 'openrouter' },
      );
    }

    return this.openRouter;
  }

  private assertValidInput(input: GenerateInput): void {
    if (!input.prompt?.trim()) {
      throw new AiGatewayError('ROUTING_ERROR', 'prompt must be a non-empty string');
    }
    if (input.complexity !== 'SIMPLE' && input.complexity !== 'COMPLEX') {
      throw new AiGatewayError(
        'ROUTING_ERROR',
        `complexity must be SIMPLE or COMPLEX (got ${String(input.complexity)})`,
      );
    }
    if (typeof input.isSensitive !== 'boolean') {
      throw new AiGatewayError(
        'ROUTING_ERROR',
        'isSensitive must be a boolean',
      );
    }
  }
}
