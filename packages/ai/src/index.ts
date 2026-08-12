export { ModelRouter } from './model-router';
export { OpenRouterAdapter } from './adapters/openrouter';
export { OllamaAdapter } from './adapters/ollama';
export { StubAdapter } from './adapters/stub';
export type { ModelAdapter } from './adapters/types';
export { AiGatewayError } from './errors';
export type { AiErrorCode } from './errors';
export {
  parseGeneratedSuggestion,
  SUGGESTION_SYSTEM_PROMPT,
} from './parse-suggestion';
export type {
  TaskComplexity,
  ImpactLevel,
  ModelProviderKind,
  RouteDecision,
  GenerateInput,
  GeneratedSuggestion,
  ChatMessage,
  CompletionRequest,
  CompletionResult,
  GenerateSuggestionResult,
  ModelRouterConfig,
} from './types';
