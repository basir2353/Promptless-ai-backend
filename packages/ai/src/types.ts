/** Shared AI gateway types for routing and suggestion generation. */

export type TaskComplexity = 'SIMPLE' | 'COMPLEX';

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ModelProviderKind = 'openrouter' | 'ollama';

export interface RouteDecision {
  provider: ModelProviderKind;
  model: string;
  reason: string;
}

export interface GenerateInput {
  prompt: string;
  context?: string | Record<string, unknown>;
  complexity: TaskComplexity;
  isSensitive: boolean;
}

/** Structured suggestion payload expected from model JSON output. */
export interface GeneratedSuggestion {
  app: string;
  issue: string;
  impact: ImpactLevel;
  timeSavedMins: number;
  explanation: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: ModelProviderKind;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface GenerateSuggestionResult {
  suggestion: GeneratedSuggestion;
  rawText: string;
  route: RouteDecision;
  model: string;
  provider: ModelProviderKind;
}

export interface ModelRouterConfig {
  openRouterApiKey?: string;
  openRouterBaseUrl?: string;
  openRouterComplexModel?: string;
  openRouterSimpleModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  temperature?: number;
  fetchImpl?: typeof fetch;
  /** When true, use offline StubAdapter (local scripts / CI without provider keys). */
  stub?: boolean;
}
