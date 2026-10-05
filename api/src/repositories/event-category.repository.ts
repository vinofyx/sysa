import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.EventCategoryWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
  };
  return Promise.all([
    prisma.eventCategory.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.eventCategory.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.eventCategory.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.EventCategoryCreateInput) {
  return prisma.eventCategory.create({ data });
}

export function update(id: string, data: Prisma.EventCategoryUpdateInput) {
  return prisma.eventCategory.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.eventCategory.update({ where: { id }, data: { deletedAt: new Date() } });
}
