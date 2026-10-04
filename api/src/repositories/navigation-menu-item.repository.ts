import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: {
  skip?: number;
  take?: number;
  active?: boolean;
  location?: 'header' | 'footer';
}) {
  const where: Prisma.NavigationMenuItemWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
    ...(params.location ? { location: params.location } : {}),
  };
  return Promise.all([
    prisma.navigationMenuItem.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.navigationMenuItem.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.navigationMenuItem.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.NavigationMenuItemCreateInput) {
  return prisma.navigationMenuItem.create({ data });
}

export function update(id: string, data: Prisma.NavigationMenuItemUpdateInput) {
  return prisma.navigationMenuItem.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.navigationMenuItem.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.navigationMenuItem.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
