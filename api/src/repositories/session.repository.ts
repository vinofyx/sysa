import { prisma } from '@lib/prisma';

export function create(data: {
  adminUserId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}) {
  return prisma.session.create({ data });
}

export function findById(id: string) {
  return prisma.session.findUnique({ where: { id } });
}

export function findByRefreshTokenHash(refreshTokenHash: string) {
  return prisma.session.findFirst({ where: { refreshTokenHash, revokedAt: null } });
}

export function findActiveByUser(adminUserId: string) {
  return prisma.session.findMany({
    where: { adminUserId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
  });
}

export function rotate(id: string, newRefreshTokenHash: string, expiresAt: Date) {
  return prisma.session.update({
    where: { id },
    data: { refreshTokenHash: newRefreshTokenHash, lastUsedAt: new Date(), expiresAt },
  });
}

export function revoke(id: string) {
  return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
}

export function revokeAllForUser(adminUserId: string) {
  return prisma.session.updateMany({
    where: { adminUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function revokeAllForUserExcept(adminUserId: string, exceptSessionId: string) {
  return prisma.session.updateMany({
    where: { adminUserId, revokedAt: null, id: { not: exceptSessionId } },
    data: { revokedAt: new Date() },
  });
}
