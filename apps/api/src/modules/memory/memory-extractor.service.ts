import { Injectable, Logger } from "@nestjs/common";
import { QdrantService } from "./qdrant.service";
import { EmbeddingService } from "./embedding.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Injectable()
export class MemoryExtractorService {
  private readonly logger = new Logger(MemoryExtractorService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async processAndStoreMemory(userId: string, rawText: string) {
    try {
      const extractedFacts = this.simpleExtractFacts(rawText);

      for (const fact of extractedFacts) {
        const vector = await this.embeddingService.generateEmbedding(fact);
        const id = crypto.randomUUID();

        // 1. Ensure User exists
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: `${userId}@placeholder.local`,
          },
        });

        // 2. Vector DB (Qdrant)
        await this.qdrantService.upsertMemory({
          id,
          vector,
          userId,
          text: fact,
          metadata: { source: "automated_extractor", originalText: rawText },
        });

        // 3. PostgreSQL (Prisma)
        await prisma.memoryItem.create({
          data: {
            id,
            userId,
            type: "extracted_fact",
            text: fact,
            embeddingId: id,
            meta: { source: "automated_extractor" },
          },
        });
      }

      return {
        success: true,
        extractedCount: extractedFacts.length,
        facts: extractedFacts,
      };
    } catch (error: any) {
      this.logger.error(
        "Failed to extract and store memory:",
        error?.message || error,
      );
      throw error;
    }
  }

  private simpleExtractFacts(text: string): string[] {
    if (!text || text.trim().length < 5) return [];
    return [text.trim()];
  }
}
