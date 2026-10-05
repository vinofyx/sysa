import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findByEmail(email: string) {
  return prisma.donor.findUnique({ where: { email } });
}

/** `phone` isn't `@unique` at the DB level (see schema.prisma comment — many
 * pre-existing rows share the blank `''` placeholder from before phone was
 * mandatory), so this excludes blanks and takes the most recent match. */
export function findByPhone(normalizedPhone: string) {
  if (!normalizedPhone) return null;
  return prisma.donor.findFirst({
    where: { phone: normalizedPhone },
    orderBy: { createdAt: 'desc' },
  });
}

export function create(data: Prisma.DonorCreateInput) {
  return prisma.donor.create({ data });
}

export function update(id: string, data: Prisma.DonorUpdateInput) {
  return prisma.donor.update({ where: { id }, data });
}

/** Finds an existing donor by email (donors are de-duplicated on email, per
 * design/12-Database-ERD.md §3.1) or creates a new one — used by manual
 * donation entry and bank-transfer-claim verification alike. */
export async function findOrCreate(input: { name: string; email: string; phone?: string }) {
  const existing = await findByEmail(input.email);
  if (existing) return existing;
  return create({ name: input.name, email: input.email, phone: input.phone ?? '' });
}

/** Mobile-first donor resolution for the online checkout flow (FR-DON — donor
 * mobile is now the primary identification field, email is optional): match
 * by normalized phone first, then by email if supplied, else create a new
 * donor. Never trusts a client-supplied donor id (resolved server-side only).
 * Kept separate from `findOrCreate` (still used, unchanged, by manual-entry
 * and bank-transfer-claim flows, which remain email-keyed) rather than
 * changing its matching behavior for those unrelated call sites. */
export async function findOrCreateByMobileOrEmail(input: {
  name: string;
  normalizedPhone: string;
  email?: string;
}) {
  const byPhone = await findByPhone(input.normalizedPhone);
  if (byPhone) return byPhone;

  if (input.email) {
    const byEmail = await findByEmail(input.email);
    if (byEmail) return byEmail;
  }

  return create({
    name: input.name,
    phone: input.normalizedPhone,
    ...(input.email ? { email: input.email } : {}),
  });
}

export function findMany(params: { skip?: number; take?: number; search?: string }) {
  const where: Prisma.DonorWhereInput = params.search
    ? {
        OR: [{ name: { contains: params.search } }, { email: { contains: params.search } }],
      }
    : {};
  return Promise.all([
    prisma.donor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.donor.count({ where }),
  ]);
}
