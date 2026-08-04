import { prisma } from '@lib/prisma';

export function create(data: { donorEmail: string; otpHash: string; expiresAt: Date }) {
  return prisma.donorOtp.create({ data });
}

export function findLatestValid(donorEmail: string) {
  return prisma.donorOtp.findFirst({
    where: { donorEmail, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
}

export function incrementAttempts(id: string) {
  return prisma.donorOtp.update({ where: { id }, data: { attempts: { increment: 1 } } });
}

export function markUsed(id: string) {
  return prisma.donorOtp.update({ where: { id }, data: { usedAt: new Date() } });
}

/** Invalidates any still-live OTP before issuing a new one, so only the most
 * recently requested code is ever valid. */
export function invalidateAllForEmail(donorEmail: string) {
  return prisma.donorOtp.updateMany({
    where: { donorEmail, usedAt: null },
    data: { usedAt: new Date() },
  });
}
