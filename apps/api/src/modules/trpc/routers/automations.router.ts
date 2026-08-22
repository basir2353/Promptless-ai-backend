import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { ensureUser, prisma } from '../../../lib/db';

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
  list: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      await ensureUser(input.userId);
      let rows = await prisma.automation.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
      });

      if (rows.length === 0) {
        await prisma.automation.createMany({
          data: SEED.map((item) => ({ ...item, userId: input.userId })),
        });
        rows = await prisma.automation.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: 'desc' },
        });
      }

      return { success: true, automations: rows.map(toUi) };
    }),

  setEnabled: publicProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const row = await prisma.automation.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
      return { success: true, id: row.id, enabled: row.enabled };
    }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1),
        trigger: z.string().min(1),
        action: z.string().min(1),
        app: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureUser(input.userId);
      const row = await prisma.automation.create({
        data: {
          userId: input.userId,
          name: input.name,
          trigger: input.trigger,
          action: input.action,
          app: input.app,
          enabled: true,
        },
      });
      return { success: true, automation: toUi(row) };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.automation.delete({ where: { id: input.id } }).catch(() => null);
      return { success: true, id: input.id };
    }),
});
