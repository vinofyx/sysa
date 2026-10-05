import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.HeroBannerWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
  };
  return Promise.all([
    prisma.heroBanner.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.heroBanner.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.heroBanner.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.HeroBannerCreateInput) {
  return prisma.heroBanner.create({ data });
}

export function update(id: string, data: Prisma.HeroBannerUpdateInput) {
  return prisma.heroBanner.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.heroBanner.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.heroBanner.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
