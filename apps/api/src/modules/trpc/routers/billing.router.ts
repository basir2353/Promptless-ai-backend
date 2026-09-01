import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';
import { signCheckoutToken } from '../../../lib/jwt';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['3 apps connected', '50 suggestions / mo', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    features: ['Unlimited apps', 'Unlimited suggestions', 'Priority model routing', 'Automations'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$49',
    features: ['Everything in Pro', 'Shared workspace memory', 'Admin controls', 'SSO'],
  },
];

export const billingRouter = router({
  getPlans: publicProcedure.query(() => ({ success: true, plans: PLANS })),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    await requireExistingUser(ctx.userId);
    const sub = await prisma.subscription.findUnique({
      where: { userId: ctx.userId },
    });
    return {
      success: true,
      planId: sub?.planId ?? 'free',
      status: sub?.status ?? 'active',
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    };
  }),

  createCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.enum(['pro', 'team']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const publicApi = process.env.PUBLIC_API_URL || 'http://localhost:3000';
      const webUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:5174';
      const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
      const checkoutToken = signCheckoutToken(userId, input.planId);

      if (stripeKey) {
        const params = new URLSearchParams({
          mode: 'subscription',
          success_url: `${webUrl}/app/settings?checkout=success`,
          cancel_url: `${webUrl}/app/settings?checkout=cancel`,
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': `Promptless ${input.planId}`,
          'line_items[0][price_data][unit_amount]': input.planId === 'pro' ? '1900' : '4900',
          'line_items[0][price_data][recurring][interval]': 'month',
          'line_items[0][quantity]': '1',
          'metadata[userId]': userId,
          'metadata[planId]': input.planId,
        });
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });
        const session = (await stripeRes.json()) as {
          url?: string;
          id?: string;
          error?: { message?: string };
        };
        if (!stripeRes.ok || !session.url) {
          throw new Error(session.error?.message || 'Stripe checkout failed');
        }
        return { success: true, provider: 'stripe', url: session.url, sessionId: session.id };
      }

      const url = `${publicApi}/billing/confirm?token=${encodeURIComponent(checkoutToken)}&redirect=${encodeURIComponent(`${webUrl}/app/settings`)}`;
      return { success: true, provider: 'local', url, sessionId: `local-${Date.now()}` };
    }),

  confirmCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.enum(['free', 'pro', 'team']),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const sub = await prisma.subscription.upsert({
        where: { userId },
        update: { planId: input.planId, status: 'active' },
        create: { userId, planId: input.planId, status: 'active' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { plan: input.planId },
      });
      return { success: true, planId: sub.planId, status: sub.status };
    }),
});
