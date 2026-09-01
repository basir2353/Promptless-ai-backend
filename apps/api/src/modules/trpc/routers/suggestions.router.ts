import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Impact } from '@prisma/client';
import { router, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

const DEFAULT_ACTIONS = [
  { id: 'fix', label: 'Fix', variant: 'primary' },
  { id: 'explain', label: 'Explain', variant: 'outline' },
  { id: 'ignore', label: 'Ignore', variant: 'ghost' },
];

const SEED = [
  {
    app: 'VS Code',
    category: 'coding',
    issue: 'Unused component detected',
    description: '`LegacyUserCard.tsx` is no longer imported. Removing it will simplify the bundle.',
    impact: Impact.MEDIUM,
    timeSavedMins: 12,
    explanation: 'Static analysis found zero references to this component.',
  },
  {
    app: 'VS Code',
    category: 'coding',
    issue: 'Missing environment variable',
    description: '`STRIPE_SECRET_KEY` is read but absent from `.env.example`.',
    impact: Impact.HIGH,
    timeSavedMins: 20,
    explanation: 'Deploy will fail at runtime without this key.',
  },
  {
    app: 'Figma',
    category: 'design',
    issue: 'Inconsistent spacing grid',
    description: 'Checkout Flow frames use spacing outside the 8px grid.',
    impact: Impact.LOW,
    timeSavedMins: 9,
    explanation: 'A consistent spacing system speeds up engineering handoff.',
  },
  {
    app: 'Gmail',
    category: 'writing',
    issue: 'Email missing a clear CTA',
    description: 'The draft is long and never asks the recipient to do one thing.',
    impact: Impact.MEDIUM,
    timeSavedMins: 6,
    explanation: 'One explicit ask improves reply rate.',
  },
  {
    app: 'Shopify',
    category: 'business',
    issue: 'Weak CTA on product page',
    description: 'Wireless Headphones Pro has no sticky add-to-cart.',
    impact: Impact.HIGH,
    timeSavedMins: 15,
    explanation: 'Sticky ATC is a high-confidence CRO pattern for long product pages.',
  },
];

function toUi(row: {
  id: string;
  app: string;
  category: string;
  issue: string;
  description: string;
  impact: Impact;
  timeSavedMins: number;
  status: string;
  explanation: string;
  createdAt: Date;
  resolvedAt: Date | null;
}) {
  return {
    id: row.id,
    app: row.app,
    category: row.category,
    issue: row.issue,
    description: row.description || row.explanation,
    impact: row.impact.toLowerCase(),
    timeSavedMins: row.timeSavedMins,
    actions: DEFAULT_ACTIONS,
    explanation: row.explanation,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
  };
}

export const suggestionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    await requireExistingUser(userId);

    let rows = await prisma.suggestion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) {
      await prisma.suggestion.createMany({
        data: SEED.map((item) => ({ ...item, userId })),
      });
      rows = await prisma.suggestion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return { success: true, suggestions: rows.map(toUi) };
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['pending', 'accepted', 'dismissed']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.suggestion.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Suggestion not found.',
        });
      }

      const resolvedAt = input.status === 'pending' ? null : new Date();
      const row = await prisma.suggestion.update({
        where: { id: existing.id },
        data: { status: input.status, resolvedAt },
      });
      return {
        success: true,
        id: row.id,
        status: row.status,
        resolvedAt: row.resolvedAt?.toISOString() ?? '',
      };
    }),
});
