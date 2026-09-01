import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

export const contextRouter = router({
  ingest: protectedProcedure
    .input(
      z.object({
        platform: z.enum(['web', 'mobile', 'desktop', 'vscode', 'browser']),
        app: z.string().default('general'),
        text: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const id = crypto.randomUUID();
      const memory = await prisma.memoryItem.create({
        data: {
          id,
          userId,
          type: 'context',
          text: input.text,
          embeddingId: id,
          meta: {
            ...(input.metadata ?? {}),
            app: input.app,
            platform: input.platform,
          },
        },
      });
      return {
        success: true,
        id: memory.id,
        message: `Context from ${input.platform} stored`,
      };
    }),
});
