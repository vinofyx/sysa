import { prisma } from '@lib/prisma';
import type { DocumentCategory, Prisma } from '@prisma/client';

export function findMany(params: {
  skip?: number;
  take?: number;
  category?: DocumentCategory;
  publicVisible?: boolean;
}) {
  const where: Prisma.DocumentRepoWhereInput = {
    deletedAt: null,
    ...(params.category ? { category: params.category } : {}),
    ...(params.publicVisible !== undefined ? { publicVisible: params.publicVisible } : {}),
  };
  return Promise.all([
    prisma.documentRepo.findMany({
      where,
      orderBy: [{ category: 'asc' }, { publishedDate: 'desc' }],
      skip: params.skip,
      take: params.take,
    }),
    prisma.documentRepo.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.documentRepo.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.DocumentRepoCreateInput) {
  return prisma.documentRepo.create({ data });
}

export function update(id: string, data: Prisma.DocumentRepoUpdateInput) {
  return prisma.documentRepo.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.documentRepo.update({ where: { id }, data: { deletedAt: new Date() } });
}
