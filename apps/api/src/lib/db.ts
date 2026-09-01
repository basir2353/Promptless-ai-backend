import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Verify an authenticated user exists in the database.
 * Never creates users from client-supplied identifiers.
 */
export async function requireExistingUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authenticated user account not found.',
    });
  }
  return user;
}
