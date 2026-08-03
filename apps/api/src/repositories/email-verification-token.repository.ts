import { prisma } from '@lib/prisma';

export function invalidateAllForUser(adminUserId: string) {
  return prisma.emailVerificationToken.updateMany({
    where: { adminUserId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export function create(data: { adminUserId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.emailVerificationToken.create({ data });
}

export function findValidByHash(tokenHash: string) {
  return prisma.emailVerificationToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function markUsed(id: string) {
  return prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } });
}
