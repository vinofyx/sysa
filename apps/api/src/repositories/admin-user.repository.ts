import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const withRole = { role: true } satisfies Prisma.AdminUserInclude;

export function findByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email }, include: withRole });
}

export function findById(id: string) {
  return prisma.adminUser.findUnique({ where: { id }, include: withRole });
}

export function findMany(params: {
  skip?: number;
  take?: number;
  roleId?: string;
  active?: boolean;
  search?: string;
}) {
  const where: Prisma.AdminUserWhereInput = {
    ...(params.roleId ? { roleId: params.roleId } : {}),
    ...(params.active !== undefined ? { active: params.active } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return Promise.all([
    prisma.adminUser.findMany({
      where,
      include: withRole,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.adminUser.count({ where }),
  ]);
}

export function create(data: {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
}) {
  return prisma.adminUser.create({ data, include: withRole });
}

export function update(id: string, data: Prisma.AdminUserUpdateInput) {
  return prisma.adminUser.update({ where: { id }, data, include: withRole });
}

export function recordFailedLogin(id: string, lockedUntil: Date | null, attempts: number) {
  return prisma.adminUser.update({
    where: { id },
    data: { failedLoginAttempts: attempts, lockedUntil },
  });
}

export function recordSuccessfulLogin(id: string, ipAddress: string | undefined) {
  return prisma.adminUser.update({
    where: { id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });
}
