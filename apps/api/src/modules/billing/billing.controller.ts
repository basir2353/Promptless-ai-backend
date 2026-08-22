import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ensureUser, prisma } from '../../lib/db';

@Controller('billing')
export class BillingController {
  @Get('confirm')
  async confirm(
    @Query('userId') userId: string,
    @Query('planId') planId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const allowed = ['free', 'pro', 'team'];
    if (!userId || !allowed.includes(planId)) {
      res.status(400).json({ error: 'userId and planId (free|pro|team) are required' });
      return;
    }

    await ensureUser(userId);
    await prisma.subscription.upsert({
      where: { userId },
      update: { planId, status: 'active' },
      create: { userId, planId, status: 'active' },
    });
    await prisma.user.update({ where: { id: userId }, data: { plan: planId } });

    const target = redirect || 'http://localhost:5174/app/settings';
    res.redirect(target);
  }
}
