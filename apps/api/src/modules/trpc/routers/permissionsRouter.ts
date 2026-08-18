import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const permissionsRouter = router({
  // 1. GET USER PERMISSIONS
  getPermissions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      // Fetch or return defaults
      return {
        success: true,
        permissions: {
          gmail: true,
          docs: true,
          shopify: true,
          vscode: true,
        },
      };
    }),

  // 2. TOGGLE APP PERMISSION
  togglePermission: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        app: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        message: `Permission for ${input.app} updated to ${input.enabled}`,
        app: input.app,
        enabled: input.enabled,
      };
    }),
});