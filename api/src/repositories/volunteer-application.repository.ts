import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const include = { volunteer: true, reviewer: true } satisfies Prisma.VolunteerApplicationInclude;

export function findMany(params: { skip?: number; take?: number; type?: string; status?: string }) {
  const where: Prisma.VolunteerApplicationWhereInput = {
    ...(params.type
      ? { type: params.type as Prisma.EnumVolunteerApplicationTypeFilter['equals'] }
      : {}),
    ...(params.status
      ? { status: params.status as Prisma.EnumVolunteerApplicationStatusFilter['equals'] }
      : {}),
  };
  return Promise.all([
    prisma.volunteerApplication.findMany({
      where,
      include,
      orderBy: { submittedAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.volunteerApplication.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.volunteerApplication.findUnique({ where: { id }, include });
}

export function create(data: Prisma.VolunteerApplicationCreateInput) {
  return prisma.volunteerApplication.create({ data, include });
}

export function updateStatus(
  id: string,
  status: 'submitted' | 'under_review' | 'accepted' | 'not_selected',
  reviewedBy: string,
  internalNote?: string,
) {
  return prisma.volunteerApplication.update({
    where: { id },
    data: { status, reviewedBy, ...(internalNote !== undefined ? { internalNote } : {}) },
    include,
  });
}
