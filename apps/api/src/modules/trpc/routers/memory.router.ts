import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const memoryRouter = router({
  addMemory: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        app: z.string().optional().default('general'),
        type: z.string().optional().default('user_fact'),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const { text, app, type, metadata } = input;
      const id = crypto.randomUUID();

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

  getUserMemories: protectedProcedure.query(async ({ ctx }) => {
    const memories = await prisma.memoryItem.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, memories };
  }),

  deleteMemory: protectedProcedure
    .input(z.object({ memoryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.memoryItem.deleteMany({
        where: { id: input.memoryId, userId: ctx.userId },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Memory not found.',
        });
      }

      return { success: true, message: 'Memory deleted!' };
    }),

  clearUserMemories: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.memoryItem.deleteMany({
      where: { userId: ctx.userId },
    });
    return { success: true, message: 'User memories cleared!' };
  }),
});
