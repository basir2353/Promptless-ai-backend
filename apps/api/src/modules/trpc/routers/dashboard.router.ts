import { router, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    await requireExistingUser(userId);

    const [suggestions, automations] = await Promise.all([
      prisma.suggestion.findMany({ where: { userId } }),
      prisma.automation.findMany({ where: { userId } }),
    ]);

    const accepted = suggestions.filter((item) => item.status === 'accepted');
    const pending = suggestions.filter((item) => item.status === 'pending');
    const minutes = accepted.reduce((sum, item) => sum + item.timeSavedMins, 0);
    const activeRuns = automations
      .filter((item) => item.enabled)
      .reduce((sum, item) => sum + item.runsThisWeek, 0);
    const score = Math.min(99, 60 + accepted.length * 4 + pending.length);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyTimeSaved = labels.map((label, index) => ({
      label,
      minutes: Math.max(8, Math.round((minutes || 40) * ((index + 3) / 14))),
    }));

    return {
      success: true,
      stats: {
        timeSavedTrend: minutes > 0 ? `+${minutes} min saved` : 'Start accepting suggestions',
        actionsAccepted: accepted.length,
        actionsAcceptedTrend: `${pending.length} pending`,
        activeAutomationRuns: activeRuns,
        productivityScore: score,
        productivityPercentile: Math.max(5, 40 - accepted.length),
        weeklyTimeSaved,
      },
    };
  }),

  activity: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    await requireExistingUser(userId);

    const [suggestions, memories, automations] = await Promise.all([
      prisma.suggestion.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.memoryItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.automation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 4,
      }),
    ]);

    const events = [
      ...suggestions.map((item) => ({
        id: `s-${item.id}`,
        app: item.app,
        label:
          item.status === 'pending'
            ? `New suggestion: ${item.issue}`
            : `${item.status}: ${item.issue}`,
        createdAt: item.createdAt.toISOString(),
        kind: 'suggestion' as const,
      })),
      ...memories.map((item) => {
        const meta = (item.meta as { app?: string } | null) ?? {};
        return {
          id: `m-${item.id}`,
          app: meta.app || 'Memory',
          label: item.text.slice(0, 80),
          createdAt: item.createdAt.toISOString(),
          kind: 'memory' as const,
        };
      }),
      ...automations.map((item) => ({
        id: `a-${item.id}`,
        app: item.app,
        label: `Automation ${item.enabled ? 'on' : 'off'}: ${item.name}`,
        createdAt: item.updatedAt.toISOString(),
        kind: 'automation' as const,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);

    return { success: true, activity: events };
  }),
});
