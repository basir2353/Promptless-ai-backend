import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { extractBearerToken, verifyAccessToken } from '../../lib/jwt';

export type AuthUser = {
  id: string;
  email: string;
};

export type TRPCContext = {
  user: AuthUser | null;
  userId: string | null;
  req: CreateExpressContextOptions['req'];
};

/**
 * Build tRPC context from the Express request.
 * Verifies `Authorization: Bearer <jwt>` when present.
 */
export function createTRPCContext({
  req,
}: CreateExpressContextOptions): TRPCContext {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return { user: null, userId: null, req };
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return { user: null, userId: null, req };
  }

  return {
    user: { id: payload.userId, email: payload.email },
    userId: payload.userId,
    req,
  };
}
