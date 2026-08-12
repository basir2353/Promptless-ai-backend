import type { CompletionRequest, CompletionResult, ModelProviderKind } from '../types';
import type { ModelAdapter } from './types';

/**
 * Offline adapter for local scripts when OpenRouter/Ollama are unavailable.
 * Returns deterministic Suggestion JSON so the full gateway + parse path can be exercised.
 */
export class StubAdapter implements ModelAdapter {
  constructor(readonly provider: ModelProviderKind = 'openrouter') {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const user = [...request.messages].reverse().find((m) => m.role === 'user');
    const prompt = user?.content ?? '';
    const appMatch = prompt.match(
      /\b(Gmail|Slack|Notion|VS Code|Shopify|Chrome)\b/i,
    );
    const app = appMatch?.[1] ?? 'Inbox';

    const suggestion = {
      app,
      issue: 'Repetitive manual triage is eating focus time',
      impact: 'MEDIUM',
      timeSavedMins: 12,
      explanation:
        'Batch similar messages with a single keyboard shortcut and auto-label rule so you clear the queue in one pass instead of context-switching per item.',
    };

    return {
      text: JSON.stringify(suggestion),
      model: request.model || 'stub/demo',
      provider: this.provider,
      usage: { promptTokens: 32, completionTokens: 64, totalTokens: 96 },
    };
  }
}
