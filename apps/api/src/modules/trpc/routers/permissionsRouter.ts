import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  gmail: true,
  docs: true,
  shopify: true,
  vscode: true,
};

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: userId.includes('@') ? userId : `${userId}@placeholder.local`,
    },
  });
}

export const permissionsRouter = router({
  getPermissions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await prisma.permission.findMany({
        where: { userId: input.userId },
      });

      const permissions = { ...DEFAULT_PERMISSIONS };
      for (const row of rows) {
        permissions[row.source] = row.enabled;
      }

      return { success: true, permissions };
    }),

  togglePermission: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        app: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureUser(input.userId);

      const permission = await prisma.permission.upsert({
        where: {
          userId_source: {
            userId: input.userId,
            source: input.app,
          },
        },
        update: { enabled: input.enabled },
        create: {
          userId: input.userId,
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
