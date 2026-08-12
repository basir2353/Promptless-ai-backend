/** Context capture + basic PII redaction helpers. */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;

export function redactPii(input: string): string {
  return input.replace(EMAIL_RE, '[REDACTED_EMAIL]').replace(PHONE_RE, '[REDACTED_PHONE]');
}

export interface CapturedContext {
  source: string;
  content: string;
  capturedAt: string;
}

export function captureContext(source: string, content: string): CapturedContext {
  return {
    source,
    content: redactPii(content),
    capturedAt: new Date().toISOString(),
  };
}
