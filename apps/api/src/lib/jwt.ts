import jwt from 'jsonwebtoken';

/** Local-dev fallback only — set JWT_SECRET in production. */
export const JWT_DEV_FALLBACK =
  'promptless-dev-jwt-secret-change-in-production';

export type AccessTokenPayload = {
  userId: string;
  email: string;
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  return secret && secret.length > 0 ? secret : JWT_DEV_FALLBACK;
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || '7d';
}

export function signAccessToken(
  payload: AccessTokenPayload,
  expiresIn: string = getJwtExpiresIn(),
): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded !== 'object' || decoded === null) return null;

    const { userId, email } = decoded as jwt.JwtPayload & Partial<AccessTokenPayload>;
    if (typeof userId !== 'string' || typeof email !== 'string') return null;

    return { userId, email };
  } catch {
    return null;
  }
}

export function extractBearerToken(
  authorization: string | string[] | undefined,
): string | null {
  const header = Array.isArray(authorization)
    ? authorization[0]
    : authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}
