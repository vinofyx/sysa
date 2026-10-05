import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.DonationCategoryWhereInput =
    params.active !== undefined ? { active: params.active } : {};
  return Promise.all([
    prisma.donationCategory.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.donationCategory.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.donationCategory.findUnique({ where: { id } });
}

export function create(data: Prisma.DonationCategoryCreateInput) {
  return prisma.donationCategory.create({ data });
}

export function update(id: string, data: Prisma.DonationCategoryUpdateInput) {
  return prisma.donationCategory.update({ where: { id }, data });
}

/** No soft-delete column — categories are financial reference data tied to
 * historical donations, so they're deactivated (`active=false`), never
 * deleted, to keep every past donation's category reference intact. */
export function deactivate(id: string) {
  return prisma.donationCategory.update({ where: { id }, data: { active: false } });
}
