import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { signAccessToken } from '../../lib/jwt';
import { exchangeGithubCode, exchangeGoogleCode } from '../../lib/oauth';
import { findOrCreateOAuthUser } from '../../lib/oauth-user';

@Controller('auth')
export class AuthController {
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const webUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:5174';
    if (error || !code) {
      res.redirect(`${webUrl}/login?error=${encodeURIComponent(error || 'oauth_cancelled')}`);
      return;
    }

    try {
      const profile = await exchangeGoogleCode(code);
      const user = await findOrCreateOAuthUser(profile);
      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
      });
      res.redirect(
        `${webUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&provider=google`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'oauth_failed';
      res.redirect(`${webUrl}/login?error=${encodeURIComponent(message)}`);
    }
  }

  @Get('github/callback')
  async githubCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const webUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:5174';
    if (error || !code) {
      res.redirect(`${webUrl}/login?error=${encodeURIComponent(error || 'oauth_cancelled')}`);
      return;
    }

    try {
      const profile = await exchangeGithubCode(code);
      const user = await findOrCreateOAuthUser(profile);
      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
      });
      res.redirect(
        `${webUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&provider=github`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'oauth_failed';
      res.redirect(`${webUrl}/login?error=${encodeURIComponent(message)}`);
    }
  }
}
