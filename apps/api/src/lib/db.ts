import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: userId.includes('@') ? userId : `${userId}@placeholder.local`,
    },
  });
}
