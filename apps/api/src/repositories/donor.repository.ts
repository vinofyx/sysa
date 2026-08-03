import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findByEmail(email: string) {
  return prisma.donor.findUnique({ where: { email } });
}

export function findById(id: string) {
  return prisma.donor.findUnique({ where: { id } });
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

export function findMany(params: { skip?: number; take?: number; search?: string }) {
  const where: Prisma.DonorWhereInput = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
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
