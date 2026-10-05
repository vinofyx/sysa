import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const include = {
  category: true,
  createdByAdmin: true,
  _count: { select: { registrations: true } },
} satisfies Prisma.EventInclude;

export function findMany(params: {
  skip?: number;
  take?: number;
  status?: string;
  categoryId?: string;
  search?: string;
}) {
  const where: Prisma.EventWhereInput = {
    deletedAt: null,
    ...(params.status ? { status: params.status as Prisma.EnumEventStatusFilter['equals'] } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.search ? { titleEn: { contains: params.search } } : {}),
  };
  return Promise.all([
    prisma.event.findMany({
      where,
      include,
      orderBy: { startDate: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.event.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.event.findFirst({ where: { id, deletedAt: null }, include });
}

export function findBySlug(slug: string) {
  return prisma.event.findFirst({ where: { slug, deletedAt: null, status: 'published' }, include });
}

export function create(data: Prisma.EventCreateInput) {
  return prisma.event.create({ data, include });
}

export function update(id: string, data: Prisma.EventUpdateInput) {
  return prisma.event.update({ where: { id }, data, include });
}

export function softDelete(id: string) {
  return prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
}
