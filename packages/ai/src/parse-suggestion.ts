import { AiGatewayError } from './errors';
import type { GeneratedSuggestion, ImpactLevel } from './types';

const IMPACT_LEVELS = new Set<ImpactLevel>(['LOW', 'MEDIUM', 'HIGH']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('No JSON object found in model output');
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing or invalid string field: ${field}`);
  }
  return value.trim();
}

function requireImpact(value: unknown): ImpactLevel {
  if (typeof value !== 'string') {
    throw new Error('Missing or invalid field: impact');
  }
  const normalized = value.trim().toUpperCase() as ImpactLevel;
  if (!IMPACT_LEVELS.has(normalized)) {
    throw new Error(`Invalid impact "${value}"; expected LOW | MEDIUM | HIGH`);
  }
  return normalized;
}

function requireTimeSavedMins(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new Error('Missing or invalid field: timeSavedMins');
  }
  return Math.round(n);
}

/**
 * Parse and validate structured Suggestion JSON from a model completion.
 */
export function parseGeneratedSuggestion(rawText: string): GeneratedSuggestion {
  try {
    const parsed = extractJsonObject(rawText);
    if (!isRecord(parsed)) {
      throw new Error('Suggestion JSON must be an object');
    }

    // Accept a few common aliases from loosely prompted models.
    const app = requireNonEmptyString(parsed.app ?? parsed.source, 'app');
    const issue = requireNonEmptyString(
      parsed.issue ?? parsed.title ?? parsed.problem,
      'issue',
    );
    const explanation = requireNonEmptyString(
      parsed.explanation ?? parsed.body ?? parsed.reason,
      'explanation',
    );
    const impact = requireImpact(parsed.impact);
    const timeSavedMins = requireTimeSavedMins(
      parsed.timeSavedMins ?? parsed.time_saved_mins ?? parsed.minutesSaved,
    );

    return { app, issue, impact, timeSavedMins, explanation };
  } catch (cause) {
    throw new AiGatewayError(
      'PARSE_ERROR',
      `Failed to parse Suggestion JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}

export const SUGGESTION_SYSTEM_PROMPT = `You are Promptless, an assistant that proposes concrete productivity suggestions.
Respond with a single JSON object only (no markdown, no prose) using this schema:
{
  "app": string,              // application or surface the issue relates to
  "issue": string,            // short description of the friction or opportunity
  "impact": "LOW" | "MEDIUM" | "HIGH",
  "timeSavedMins": number,    // estimated minutes saved if applied
  "explanation": string       // why this helps and how to apply it
}`;
