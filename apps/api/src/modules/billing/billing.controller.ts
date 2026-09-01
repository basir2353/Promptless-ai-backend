import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { prisma } from '../../lib/db';
import { verifyCheckoutToken } from '../../lib/jwt';

@Controller('billing')
export class BillingController {
  @Get('confirm')
  async confirm(
    @Query('token') token: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const allowed = ['free', 'pro', 'team'];
    const payload = token ? verifyCheckoutToken(token) : null;

    if (!payload || !allowed.includes(payload.planId)) {
      res.status(400).json({ error: 'Valid checkout token and planId are required' });
      return;
    }

    await prisma.subscription.upsert({
      where: { userId: payload.userId },
      update: { planId: payload.planId, status: 'active' },
      create: { userId: payload.userId, planId: payload.planId, status: 'active' },
    });
    await prisma.user.update({
      where: { id: payload.userId },
      data: { plan: payload.planId },
    });

    const target = redirect || 'http://localhost:5174/app/settings';
    res.redirect(target);
  }
}
