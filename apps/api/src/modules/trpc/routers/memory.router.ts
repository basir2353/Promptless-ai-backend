import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const memoryRouter = router({
  // 1. ADD MEMORY / CONTEXT
  addMemory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        text: z.string(),
        app: z.string().optional().default('general'),
        type: z.string().optional().default('user_fact'),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, text, app, type, metadata } = input;
      const id = crypto.randomUUID();

      // Ensure User exists in PostgreSQL
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@placeholder.local`,
        },
      });

      // Save to PostgreSQL with App and Metadata context
      const memory = await prisma.memoryItem.create({
        data: {
          id,
          userId,
          type: type || 'user_fact',
          text,
          embeddingId: id,
          meta: {
            ...(metadata || {}),
            app: app || 'general',
          },
        },
      });

      return {
        success: true,
        id,
        memory,
        message: 'Memory stored in database successfully!',
      };
    }),

  // 2. GET USER MEMORIES
  getUserMemories: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const memories = await prisma.memoryItem.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, memories };
    }),

  // 3. DELETE MEMORY
  deleteMemory: publicProcedure
    .input(z.object({ memoryId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.memoryItem
        .delete({
          where: { id: input.memoryId },
        })
        .catch(() => null);

      return { success: true, message: 'Memory deleted!' };
    }),

  // 4. CLEAR USER MEMORIES
  clearUserMemories: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.memoryItem.deleteMany({
        where: { userId: input.userId },
      });
      return { success: true, message: 'User memories cleared!' };
    }),
});