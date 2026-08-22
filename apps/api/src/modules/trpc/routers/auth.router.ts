import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../../../lib/password';
import { prisma } from '../../../lib/db';
import { publicProcedure, router } from '../trpc';

function toUser(row: { id: string; email: string; name: string }) {
  return { id: row.id, name: row.name || row.email.split('@')[0], email: row.email };
}

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(2),
        email: z.string().trim().email().transform((value) => value.toLowerCase()),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });

      if (existing?.passwordHash) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists.',
        });
      }

      const passwordHash = hashPassword(input.password);
      const row = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { name: input.name, passwordHash },
          })
        : await prisma.user.create({
            data: {
              email: input.email,
              name: input.name,
              passwordHash,
            },
          });

      return { success: true, user: toUser(row) };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email().transform((value) => value.toLowerCase()),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const row = await prisma.user.findUnique({ where: { email: input.email } });
      if (!row?.passwordHash || !verifyPassword(input.password, row.passwordHash)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Incorrect email or password.',
        });
      }

      return { success: true, user: toUser(row) };
    }),

  me: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const row = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
      }
      return { success: true, user: toUser(row) };
    }),
});
