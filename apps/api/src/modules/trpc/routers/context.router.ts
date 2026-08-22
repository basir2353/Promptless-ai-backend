import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { ensureUser, prisma } from '../../../lib/db';

export const contextRouter = router({
  ingest: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        platform: z.enum(['web', 'mobile', 'desktop', 'vscode', 'browser']),
        app: z.string().default('general'),
        text: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureUser(input.userId);
      const id = crypto.randomUUID();
      const memory = await prisma.memoryItem.create({
        data: {
          id,
          userId: input.userId,
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
