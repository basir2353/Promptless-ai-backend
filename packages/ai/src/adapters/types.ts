import type {
  CompletionRequest,
  CompletionResult,
  ModelProviderKind,
} from "../types";

/** Standard interface every model provider adapter must implement. */
export interface ModelAdapter {
  readonly provider: ModelProviderKind;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
