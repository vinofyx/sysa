import { prisma } from '@lib/prisma';

export function invalidateAllForUser(adminUserId: string) {
  return prisma.passwordResetToken.updateMany({
    where: { adminUserId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export function create(data: { adminUserId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data });
}

export function findValidByHash(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
}

export function markUsed(id: string) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}
