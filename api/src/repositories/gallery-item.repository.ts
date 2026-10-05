import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findById(id: string) {
  return prisma.galleryItem.findFirst({ where: { id, deletedAt: null } });
}

export function findManyByAlbum(albumId: string) {
  return prisma.galleryItem.findMany({
    where: { albumId, deletedAt: null },
    orderBy: { displayOrder: 'asc' },
  });
}

export function create(data: Prisma.GalleryItemCreateInput) {
  return prisma.galleryItem.create({ data });
}

export function update(id: string, data: Prisma.GalleryItemUpdateInput) {
  return prisma.galleryItem.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.galleryItem.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.galleryItem.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
