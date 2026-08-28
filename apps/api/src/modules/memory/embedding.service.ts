import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAIEmbeddings } from "@langchain/openai";

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddings: OpenAIEmbeddings;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
      modelName: "openai/text-embedding-3-small",
      dimensions: 1536,
    });
  }

  // Single text snippet ko vector mein convert karne ke liye
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const vector = await this.embeddings.embedQuery(text);
      this.logger.log(`Generated embedding vector length: ${vector.length}`);
      return vector;
    } catch (error) {
      this.logger.error("Failed to generate embedding vector:", error);
      throw error;
    }
  }

  // Multiple texts ko ek sath array batch mein embed karne ke liye
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      return await this.embeddings.embedDocuments(texts);
    } catch (error) {
      this.logger.error("Failed to generate batch embeddings:", error);
      throw error;
    }
  }
}
