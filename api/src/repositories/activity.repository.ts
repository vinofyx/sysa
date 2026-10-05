import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.ActivityWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
  };
  return Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
      include: { linkedCategory: true },
    }),
    prisma.activity.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.activity.findFirst({
    where: { id, deletedAt: null },
    include: { linkedCategory: true },
  });
}

export function create(data: Prisma.ActivityCreateInput) {
  return prisma.activity.create({ data });
}

export function update(id: string, data: Prisma.ActivityUpdateInput) {
  return prisma.activity.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.activity.update({ where: { id: item.id }, data: { displayOrder: item.displayOrder } }),
    ),
  );
}
