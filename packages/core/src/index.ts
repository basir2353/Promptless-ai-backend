/** Shared health-check response shape used by the API and clients. */
export interface HealthResponse {
  status: "ok" | "degraded";
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  database?: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
}

/** Common API error envelope. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  path?: string;
  timestamp: string;
}

/** Impact levels aligned with Prisma `Impact` enum. */
export type Impact = "LOW" | "MEDIUM" | "HIGH";

/**
 * Suggestion shape shared across apps (matches Prisma Suggestion fields
 * the AI gateway produces / persists).
 */
export interface Suggestion {
  id: string;
  userId?: string;
  app: string;
  issue: string;
  impact: Impact;
  timeSavedMins: number;
  status: string;
  explanation: string;
  createdAt: string;
  updatedAt?: string;
}

/** AI-generated suggestion payload before persistence. */
export interface SuggestionDraft {
  app: string;
  issue: string;
  impact: Impact;
  timeSavedMins: number;
  explanation: string;
}

export * from "./schemas";
