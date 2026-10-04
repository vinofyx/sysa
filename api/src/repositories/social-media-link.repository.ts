import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.SocialMediaLinkWhereInput =
    params.active !== undefined ? { active: params.active } : {};
  return Promise.all([
    prisma.socialMediaLink.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.socialMediaLink.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.socialMediaLink.findUnique({ where: { id } });
}

export function create(data: Prisma.SocialMediaLinkCreateInput) {
  return prisma.socialMediaLink.create({ data });
}

export function update(id: string, data: Prisma.SocialMediaLinkUpdateInput) {
  return prisma.socialMediaLink.update({ where: { id }, data });
}

/** No `deletedAt` column on this model (small, low-churn list) — a hard delete
 * is acceptable here since removing a social link has no audit/reporting value
 * once gone, unlike content or financial records. */
export function softDelete(id: string) {
  return prisma.socialMediaLink.delete({ where: { id } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.socialMediaLink.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
