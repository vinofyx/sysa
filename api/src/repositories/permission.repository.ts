import { prisma } from '@lib/prisma';

export function findAll() {
  return prisma.permission.findMany({ orderBy: { code: 'asc' } });
}

export function findByCodes(codes: string[]) {
  return prisma.permission.findMany({ where: { code: { in: codes } } });
}
