import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiGatewayError,
  ModelRouter,
  type GenerateInput,
  type GenerateSuggestionResult,
} from '@promptless/ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly router: ModelRouter;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.router = new ModelRouter({
      openRouterApiKey: this.config.get<string>('ai.openRouterApiKey'),
      openRouterBaseUrl: this.config.get<string>('ai.openRouterBaseUrl'),
      openRouterComplexModel: this.config.get<string>('ai.complexModel'),
      openRouterSimpleModel: this.config.get<string>('ai.simpleModel'),
      ollamaBaseUrl: this.config.get<string>('ai.ollamaBaseUrl'),
      ollamaModel: this.config.get<string>('ai.ollamaModel'),
      temperature: this.config.get<number>('ai.temperature'),
      stub: this.config.get<boolean>('ai.stub') === true,
    });
  }

  decideRoute(complexity: GenerateInput['complexity'], isSensitive: boolean) {
    return this.router.decideRoute(complexity, isSensitive);
  }

  async generateSuggestion(
    input: GenerateInput,
  ): Promise<GenerateSuggestionResult> {
    try {
      const result = await this.router.generateSuggestion(input);
      this.logger.debug(
        `Suggestion via ${result.provider}/${result.model} (${result.route.reason})`,
      );
      return result;
    } catch (error) {
      if (error instanceof AiGatewayError) {
        this.logger.warn(`AI gateway ${error.code}: ${error.message}`);
      }
      throw error;
    }
  }
}
