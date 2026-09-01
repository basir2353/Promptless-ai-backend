import { prisma } from './db';
import type { OAuthProfile } from './oauth';

export async function findOrCreateOAuthUser(profile: OAuthProfile) {
  const providerField = profile.provider === 'google' ? 'googleId' : 'githubId';

  const byProvider = await prisma.user.findFirst({
    where: { [providerField]: profile.providerId },
  });
  if (byProvider) {
    return prisma.user.update({
      where: { id: byProvider.id },
      data: {
        name: profile.name || byProvider.name,
        avatarUrl: profile.avatarUrl ?? byProvider.avatarUrl,
      },
    });
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        [providerField]: profile.providerId,
        name: profile.name || byEmail.name,
        avatarUrl: profile.avatarUrl ?? byEmail.avatarUrl,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      [providerField]: profile.providerId,
    },
  });
}
