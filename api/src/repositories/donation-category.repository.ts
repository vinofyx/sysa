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

/**
 * The category a checkout refers to: by id first, then — only when the id is
 * unknown — by its stable `code`, and only if that category is active.
 * Category ids are random per database, so a website built from a snapshot
 * (static export, or the API-unreachable fallback) can carry ids another
 * database never had; the code is the same in every database.
 */
export async function findForCheckout(id: string, code?: string) {
  const byId = await findById(id);
  if (byId || !code) return { category: byId, matchedBy: byId ? ('id' as const) : null };
  const byCode = await prisma.donationCategory.findUnique({ where: { code } });
  return byCode?.active
    ? { category: byCode, matchedBy: 'code' as const }
    : { category: null, matchedBy: null };
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
