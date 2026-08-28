/** Lightweight runtime validators for shared shapes (no external deps). */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function assertEnv(name: string, value: string | undefined): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
