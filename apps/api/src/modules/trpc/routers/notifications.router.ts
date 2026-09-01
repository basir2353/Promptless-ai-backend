import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

async function sendFcm(token: string, title: string, body: string): Promise<boolean> {
  const key = process.env.FCM_SERVER_KEY?.trim();
  if (!key) return false;
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
    }),
  });
  return res.ok;
}

export const notificationsRouter = router({
  registerDevice: protectedProcedure
    .input(
      z.object({
        platform: z.enum(['web', 'ios', 'android', 'desktop']),
        provider: z.enum(['fcm', 'apns', 'web']),
        token: z.string().min(3),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const device = await prisma.deviceToken.upsert({
        where: { userId_token: { userId, token: input.token } },
        update: { platform: input.platform, provider: input.provider },
        create: {
          userId,
          platform: input.platform,
          provider: input.provider,
          token: input.token,
        },
      });
      return { success: true, id: device.id };
    }),

  listDevices: protectedProcedure.query(async ({ ctx }) => {
    await requireExistingUser(ctx.userId);
    const devices = await prisma.deviceToken.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, devices };
  }),

  send: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const devices = await prisma.deviceToken.findMany({ where: { userId } });
      let delivered = 0;
      for (const device of devices) {
        if (device.provider === 'fcm' && (await sendFcm(device.token, input.title, input.body))) {
          delivered += 1;
        }
      }
      const status = delivered > 0 ? 'sent' : 'stored';
      const notification = await prisma.pushNotification.create({
        data: {
          userId,
          title: input.title,
          body: input.body,
          status,
        },
      });
      return {
        success: true,
        id: notification.id,
        status,
        devices: devices.length,
        delivered,
        fcmConfigured: Boolean(process.env.FCM_SERVER_KEY?.trim()),
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    await requireExistingUser(ctx.userId);
    const items = await prisma.pushNotification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { success: true, notifications: items };
  }),
});
