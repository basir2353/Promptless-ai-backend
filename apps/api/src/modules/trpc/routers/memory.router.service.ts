import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { QdrantService } from '../../memory/qdrant.service';
import { EmbeddingService } from '../../memory/embedding.service';
import { MemoryExtractorService } from '../../memory/memory-extractor.service';
import { ContextRetrieverService } from '../../memory/context-retriever.service';

const prisma = new PrismaClient();

@Injectable()
export class MemoryRouterService {
  private readonly logger = new Logger(MemoryRouterService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
    private readonly memoryExtractorService: MemoryExtractorService,
    private readonly contextRetrieverService: ContextRetrieverService,
  ) {}

  async addMemory(
    userId: string,
    text: string,
    type: string = 'user_fact',
    metadata?: Record<string, any>,
  ) {
    try {
      const vector = await this.embeddingService.generateEmbedding(text);
      const id = crypto.randomUUID();

      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@placeholder.local`,
        },
      });

      await this.qdrantService.upsertMemory({
        id,
        vector,
        userId,
        text,
        metadata,
      });

      await prisma.memoryItem.create({
        data: {
          id,
          userId,
          type,
          text,
          embeddingId: id,
          meta: metadata || {},
        },
      });

      return {
        success: true,
        id,
        message: 'Memory stored in both Qdrant and PostgreSQL successfully!',
      };
    } catch (error: any) {
      this.logger.error(`Failed to add memory for user ${userId}:`, error);
      throw error;
    }
  }

  async searchMemories(userId: string, query: string, limit: number = 5) {
    const queryVector = await this.embeddingService.generateEmbedding(query);
    return this.qdrantService.searchSimilar(userId, queryVector, limit);
  }

  async getUserMemories(userId: string) {
    return prisma.memoryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMemory(memoryId: string) {
    await this.qdrantService.deleteMemory(memoryId);
    await prisma.memoryItem
      .delete({
        where: { id: memoryId },
      })
      .catch(() => null);

    return {
      success: true,
      message: 'Memory deleted from both Qdrant and PostgreSQL!',
    };
  }

  async extractAndStore(userId: string, text: string) {
    return this.memoryExtractorService.processAndStoreMemory(userId, text);
  }

  async getLLMContext(userId: string, query: string, limit: number = 3) {
    return this.contextRetrieverService.buildLLMContext(userId, query, limit);
  }

  async clearUserMemories(userId: string) {
    await this.qdrantService.clearUserMemories(userId);
    await prisma.memoryItem.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'All user memories cleared from Qdrant and PostgreSQL!',
    };
  }
}