import { Prisma } from '@prisma/client';

import { prisma } from '@lib/prisma';

const include = {
  donor: true,
  category: true,
} satisfies Prisma.DonorSubscriptionInclude;

export interface DonorSubscriptionFilters {
  skip?: number;
  take?: number;
  status?: string;
  categoryId?: string;
}

function buildWhere(params: DonorSubscriptionFilters): Prisma.DonorSubscriptionWhereInput {
  return {
    ...(params.status
      ? { status: params.status as Prisma.EnumSubscriptionStatusFilter['equals'] }
      : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
  };
}

export function findMany(params: DonorSubscriptionFilters) {
  const where = buildWhere(params);
  return Promise.all([
    prisma.donorSubscription.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.donorSubscription.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.donorSubscription.findUnique({ where: { id }, include });
}

export function findByRazorpaySubscriptionId(razorpaySubscriptionId: string) {
  return prisma.donorSubscription.findUnique({
    where: { razorpaySubscriptionId },
    include,
  });
}

export function create(data: Prisma.DonorSubscriptionCreateInput) {
  return prisma.donorSubscription.create({ data, include });
}

export function updateStatus(
  id: string,
  status:
    | 'created'
    | 'authenticated'
    | 'active'
    | 'pending'
    | 'halted'
    | 'paused'
    | 'cancelled'
    | 'completed'
    | 'expired',
  nextChargeAt?: Date | null,
) {
  return prisma.donorSubscription.update({
    where: { id },
    data: {
      status,
      ...(nextChargeAt !== undefined ? { nextChargeAt } : {}),
    },
    include,
  });
}

export function markCancelled(id: string) {
  return prisma.donorSubscription.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: new Date() },
    include,
  });
}
