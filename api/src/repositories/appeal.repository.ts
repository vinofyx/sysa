import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; status?: string }) {
  const where: Prisma.AppealWhereInput = params.status
    ? { status: params.status as Prisma.EnumAppealStatusFilter['equals'] }
    : {};
  return Promise.all([
    prisma.appeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
      include: { category: true },
    }),
    prisma.appeal.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.appeal.findUnique({ where: { id }, include: { category: true } });
}

export function create(data: Prisma.AppealCreateInput) {
  return prisma.appeal.create({ data, include: { category: true } });
}

export function update(id: string, data: Prisma.AppealUpdateInput) {
  return prisma.appeal.update({ where: { id }, data, include: { category: true } });
}

export function archive(id: string) {
  return prisma.appeal.update({ where: { id }, data: { status: 'archived' } });
}

/** Recalculates the denormalized `raisedAmountCache` from completed donations
 * — called after any donation linked to this appeal changes status, per the
 * cache-maintenance rule in design/12-Database-ERD.md §3.5. */
export async function recalculateRaisedAmount(appealId: string): Promise<void> {
  const result = await prisma.donation.aggregate({
    where: { appealId, status: 'completed' },
    _sum: { amount: true },
  });
  await prisma.appeal.update({
    where: { id: appealId },
    data: { raisedAmountCache: result._sum.amount ?? 0 },
  });
}
