import { TRPCError } from '@trpc/server';

export type OAuthProfile = {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `${name} is not configured.`,
    });
  }
  return value;
}

export function getGoogleAuthUrl(state?: string): string {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  if (state) params.set('state', state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getGithubAuthUrl(state?: string): string {
  const clientId = requireEnv('GITHUB_CLIENT_ID');
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI?.trim() ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });
  if (state) params.set('state', state);
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: tokenData.error || 'Google token exchange failed.',
    });
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profileRes.ok || !profile.id || !profile.email) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Google profile fetch failed.',
    });
  }

  return {
    provider: 'google',
    providerId: profile.id,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    avatarUrl: profile.picture,
  };
}

export async function exchangeGithubCode(code: string): Promise<OAuthProfile> {
  const clientId = requireEnv('GITHUB_CLIENT_ID');
  const clientSecret = requireEnv('GITHUB_CLIENT_SECRET');
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI?.trim() ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/auth/github/callback`;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: tokenData.error_description || tokenData.error || 'GitHub token exchange failed.',
    });
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Promptless-API',
    },
  });
  const user = (await userRes.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };

  if (!userRes.ok || !user.id) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'GitHub profile fetch failed.',
    });
  }

  let email = user.email?.toLowerCase();
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Promptless-API',
      },
    });
    const emails = (await emailsRes.json()) as Array<{
      email?: string;
      primary?: boolean;
      verified?: boolean;
    }>;
    email =
      emails.find((item) => item.primary && item.verified)?.email?.toLowerCase() ||
      emails.find((item) => item.verified)?.email?.toLowerCase();
  }

  if (!email) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'GitHub account has no verified email.',
    });
  }

  return {
    provider: 'github',
    providerId: String(user.id),
    email,
    name: user.name || user.login || email.split('@')[0],
    avatarUrl: user.avatar_url,
  };
}
