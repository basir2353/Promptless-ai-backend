import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

const SEED = [
  { name: 'Inbox triage on open', trigger: 'Gmail opens', action: 'Summarize unread + flag urgent', app: 'Gmail', enabled: true, runsThisWeek: 18 },
  { name: 'Shopify CRO sweep', trigger: 'Shopify Admin opens', action: 'Run CRO audit on top 5 products', app: 'Shopify', enabled: true, runsThisWeek: 5 },
  { name: 'Meeting notes autopilot', trigger: 'Zoom call starts', action: 'Take notes + draft follow-up email', app: 'Zoom', enabled: true, runsThisWeek: 7 },
];

function toUi(row: {
  id: string;
  name: string;
  trigger: string;
  action: string;
  app: string;
  enabled: boolean;
  runsThisWeek: number;
}) {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    action: row.action,
    app: row.app,
    enabled: row.enabled,
    runsThisWeek: row.runsThisWeek,
  };
}

export const automationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    await requireExistingUser(userId);

    let rows = await prisma.automation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) {
      await prisma.automation.createMany({
        data: SEED.map((item) => ({ ...item, userId })),
      });
      rows = await prisma.automation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return { success: true, automations: rows.map(toUi) };
  }),

  setEnabled: protectedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.automation.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }

      const row = await prisma.automation.update({
        where: { id: existing.id },
        data: { enabled: input.enabled },
      });
      return { success: true, id: row.id, enabled: row.enabled };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        trigger: z.string().min(1),
        action: z.string().min(1),
        app: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const row = await prisma.automation.create({
        data: {
          userId,
          name: input.name,
          trigger: input.trigger,
          action: input.action,
          app: input.app,
          enabled: true,
        },
      });
      return { success: true, automation: toUi(row) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.automation.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }
      return { success: true, id: input.id };
    }),
});
