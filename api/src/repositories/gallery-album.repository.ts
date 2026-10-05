import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; category?: string }) {
  const where: Prisma.GalleryAlbumWhereInput = {
    deletedAt: null,
    ...(params.category ? { category: params.category } : {}),
  };
  return Promise.all([
    prisma.galleryAlbum.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
      include: { _count: { select: { items: true } } },
    }),
    prisma.galleryAlbum.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.galleryAlbum.findFirst({
    where: { id, deletedAt: null },
    include: { items: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } } },
  });
}

export function create(data: Prisma.GalleryAlbumCreateInput) {
  return prisma.galleryAlbum.create({ data });
}

export function update(id: string, data: Prisma.GalleryAlbumUpdateInput) {
  return prisma.galleryAlbum.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.galleryAlbum.update({ where: { id }, data: { deletedAt: new Date() } });
}
