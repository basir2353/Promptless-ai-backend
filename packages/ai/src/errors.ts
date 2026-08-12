export type AiErrorCode =
  | 'CONFIG_ERROR'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'ROUTING_ERROR';

export class AiGatewayError extends Error {
  readonly code: AiErrorCode;
  readonly provider?: string;
  readonly cause?: unknown;

  constructor(
    code: AiErrorCode,
    message: string,
    options?: { provider?: string; cause?: unknown },
  ) {
    super(message);
    this.name = 'AiGatewayError';
    this.code = code;
    this.provider = options?.provider;
    this.cause = options?.cause;
  }
}
