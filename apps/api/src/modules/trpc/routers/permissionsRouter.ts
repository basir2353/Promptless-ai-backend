import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  gmail: true,
  docs: true,
  shopify: true,
  vscode: true,
};

export const permissionsRouter = router({
  getPermissions: protectedProcedure.query(async ({ ctx }) => {
    const rows = await prisma.permission.findMany({
      where: { userId: ctx.userId },
    });

    const permissions = { ...DEFAULT_PERMISSIONS };
    for (const row of rows) {
      permissions[row.source] = row.enabled;
    }

    return { success: true, permissions };
  }),

  togglePermission: protectedProcedure
    .input(
      z.object({
        app: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      const permission = await prisma.permission.upsert({
        where: {
          userId_source: {
            userId,
            source: input.app,
          },
        },
        update: { enabled: input.enabled },
        create: {
          userId,
          source: input.app,
          enabled: input.enabled,
        },
      });

      return {
        success: true,
        message: `Permission for ${permission.source} updated to ${permission.enabled}`,
        app: permission.source,
        enabled: permission.enabled,
      };
    }),
});
