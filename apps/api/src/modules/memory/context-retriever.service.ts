import { Injectable } from "@nestjs/common";
import { QdrantService } from "./qdrant.service";
import { EmbeddingService } from "./embedding.service";

@Injectable()
export class ContextRetrieverService {
  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * User Query ke mutabiq past memories fetch karke LLM System Prompt ke liye format karta hai.
   */
  async buildLLMContext(
    userId: string,
    userQuery: string,
    limit: number = 3,
  ): Promise<string> {
    const queryVector =
      await this.embeddingService.generateEmbedding(userQuery);
    const results = await this.qdrantService.searchSimilar(
      userId,
      queryVector,
      limit,
    );

    if (!results || results.length === 0) {
      return "";
    }

    const memoryStrings = results
      .map(
        (item: any, idx: number) =>
          `- [Memory ${idx + 1}]: ${item.payload?.text || ""}`,
      )
      .join("\n");

    return `\n### Relevant User Background & Context:\n${memoryStrings}\n`;
  }
}
