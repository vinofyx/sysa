import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const include = { author: true } satisfies Prisma.EventNewsPostInclude;

export function findMany(params: {
  skip?: number;
  take?: number;
  status?: string;
  category?: string;
  search?: string;
}) {
  const where: Prisma.EventNewsPostWhereInput = {
    type: 'news',
    deletedAt: null,
    ...(params.status ? { status: params.status as Prisma.EnumPostStatusFilter['equals'] } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.search ? { titleEn: { contains: params.search } } : {}),
  };
  return Promise.all([
    prisma.eventNewsPost.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.eventNewsPost.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.eventNewsPost.findFirst({ where: { id, type: 'news', deletedAt: null }, include });
}

export function findBySlug(slug: string) {
  return prisma.eventNewsPost.findFirst({
    where: { slug, type: 'news', deletedAt: null, status: 'published' },
    include,
  });
}

export function create(data: Omit<Prisma.EventNewsPostCreateInput, 'type'>) {
  return prisma.eventNewsPost.create({ data: { ...data, type: 'news' }, include });
}

export function update(id: string, data: Prisma.EventNewsPostUpdateInput) {
  return prisma.eventNewsPost.update({ where: { id }, data, include });
}

export function softDelete(id: string) {
  return prisma.eventNewsPost.update({ where: { id }, data: { deletedAt: new Date() } });
}
