import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findByKey(pageKey: string) {
  return prisma.pageContent.findUnique({ where: { pageKey } });
}

export function findAll() {
  return prisma.pageContent.findMany({ orderBy: { pageKey: 'asc' } });
}

export function upsert(pageKey: string, data: Prisma.PageContentUpdateInput) {
  return prisma.pageContent.upsert({
    where: { pageKey },
    update: data,
    create: {
      pageKey,
      blocksEn: (data.blocksEn ?? {}) as Prisma.InputJsonValue,
      blocksTe: data.blocksTe as Prisma.InputJsonValue | undefined,
    },
  });
}
