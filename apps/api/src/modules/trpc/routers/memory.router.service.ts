import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { QdrantService } from '../../memory/qdrant.service';
import { EmbeddingService } from '../../memory/embedding.service';
import { MemoryExtractorService } from '../../memory/memory-extractor.service';
import { ContextRetrieverService } from '../../memory/context-retriever.service';

const t = initTRPC.create();
const prisma = new PrismaClient();

@Injectable()
export class MemoryRouterService {
  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
    private readonly memoryExtractorService: MemoryExtractorService,
    private readonly contextRetrieverService: ContextRetrieverService,
  ) {}

  get router() {
    return t.router({
      // 1. ADD MEMORY (Dual-Write)
      addMemory: t.procedure
        .input(
          z.object({
            userId: z.string(),
            text: z.string(),
            type: z.string().optional().default('user_fact'),
            metadata: z.record(z.any()).optional(),
          }),
        )
        .mutation(async (opts: { input: { userId: string; text: string; type?: string; metadata?: Record<string, any> } }) => {
          const { userId, text, type, metadata } = opts.input;
          
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
              type: type || 'user_fact',
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
        }),

      // 2. SEARCH MEMORIES
      searchMemories: t.procedure
        .input(
          z.object({
            userId: z.string(),
            query: z.string(),
            limit: z.number().optional().default(5),
          }),
        )
        .query(async (opts: { input: { userId: string; query: string; limit: number } }) => {
          const { userId, query, limit } = opts.input;

          const queryVector = await this.embeddingService.generateEmbedding(query);

          const results = await this.qdrantService.searchSimilar(
            userId,
            queryVector,
            limit,
          );

          return {
            success: true,
            results,
          };
        }),

      // 3. DELETE MEMORY
      deleteMemory: t.procedure
        .input(
          z.object({
            memoryId: z.string(),
          }),
        )
        .mutation(async (opts: { input: { memoryId: string } }) => {
          const { memoryId } = opts.input;

          await this.qdrantService.deleteMemory(memoryId);
          await prisma.memoryItem.delete({
            where: { id: memoryId },
          }).catch(() => null);

          return {
            success: true,
            message: 'Memory deleted from both Qdrant and PostgreSQL!',
          };
        }),

      // 4. EXTRACT AND STORE MEMORY
      extractAndStore: t.procedure
        .input(
          z.object({
            userId: z.string(),
            text: z.string(),
          }),
        )
        .mutation(async (opts: { input: { userId: string; text: string } }) => {
          const { userId, text } = opts.input;
          return await this.memoryExtractorService.processAndStoreMemory(userId, text);
        }),

      // 5. GET FORMATTED CONTEXT FOR LLM
      getLLMContext: t.procedure
        .input(
          z.object({
            userId: z.string(),
            query: z.string(),
            limit: z.number().optional().default(3),
          }),
        )
        .query(async (opts: { input: { userId: string; query: string; limit: number } }) => {
          const { userId, query, limit } = opts.input;
          const context = await this.contextRetrieverService.buildLLMContext(userId, query, limit);
          return { success: true, context };
        }),

      // 6. CLEAR ALL MEMORIES
      clearUserMemories: t.procedure
        .input(
          z.object({
            userId: z.string(),
          }),
        )
        .mutation(async (opts: { input: { userId: string } }) => {
          const { userId } = opts.input;

          await this.qdrantService.clearUserMemories(userId);
          await prisma.memoryItem.deleteMany({
            where: { userId },
          });

          return {
            success: true,
            message: 'All user memories cleared from Qdrant and PostgreSQL!',
          };
        }),
    });
  }
}