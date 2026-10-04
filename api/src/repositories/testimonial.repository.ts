import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.TestimonialWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
  };
  return Promise.all([
    prisma.testimonial.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.testimonial.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.testimonial.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.TestimonialCreateInput) {
  return prisma.testimonial.create({ data });
}

export function update(id: string, data: Prisma.TestimonialUpdateInput) {
  return prisma.testimonial.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.testimonial.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.testimonial.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
