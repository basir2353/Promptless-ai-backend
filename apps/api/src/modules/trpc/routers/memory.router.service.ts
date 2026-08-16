import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { QdrantService } from '../../memory/qdrant.service';
import { EmbeddingService } from '../../memory/embedding.service';

const t = initTRPC.create();

@Injectable()
export class MemoryRouterService {
  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  get router() {
    return t.router({
      addMemory: t.procedure
        .input(
          z.object({
            userId: z.string(),
            text: z.string(),
            metadata: z.record(z.any()).optional(),
          }),
        )
        .mutation(async (opts: { input: { userId: string; text: string; metadata?: Record<string, any> } }) => {
          const { userId, text, metadata } = opts.input;
          
          const vector = await this.embeddingService.generateEmbedding(text);
          const id = crypto.randomUUID();

          await this.qdrantService.upsertMemory({
            id,
            vector,
            userId,
            text,
            metadata,
          });

          return {
            success: true,
            id,
            message: 'Memory embedded and stored successfully!',
          };
        }),

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

      deleteMemory: t.procedure
        .input(
          z.object({
            memoryId: z.string(),
          }),
        )
        .mutation(async (opts: { input: { memoryId: string } }) => {
          await this.qdrantService.deleteMemory(opts.input.memoryId);
          return {
            success: true,
            message: 'Memory deleted successfully!',
          };
        }),

      clearUserMemories: t.procedure
        .input(
          z.object({
            userId: z.string(),
          }),
        )
        .mutation(async (opts: { input: { userId: string } }) => {
          await this.qdrantService.clearUserMemories(opts.input.userId);
          return {
            success: true,
            message: 'All user memories cleared successfully!',
          };
        }),
    });
  }
}