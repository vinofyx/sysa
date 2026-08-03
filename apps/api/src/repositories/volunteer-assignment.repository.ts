import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

const include = {
  volunteer: true,
  assignedByAdmin: true,
} satisfies Prisma.VolunteerAssignmentInclude;

export function findMany(params: {
  skip?: number;
  take?: number;
  volunteerId?: string;
  status?: string;
}) {
  const where: Prisma.VolunteerAssignmentWhereInput = {
    ...(params.volunteerId ? { volunteerId: params.volunteerId } : {}),
    ...(params.status
      ? { status: params.status as Prisma.EnumAssignmentStatusFilter['equals'] }
      : {}),
  };
  return Promise.all([
    prisma.volunteerAssignment.findMany({
      where,
      include,
      orderBy: { assignedDate: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.volunteerAssignment.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.volunteerAssignment.findUnique({ where: { id }, include });
}

export function create(data: Prisma.VolunteerAssignmentCreateInput) {
  return prisma.volunteerAssignment.create({ data, include });
}

export function update(id: string, data: Prisma.VolunteerAssignmentUpdateInput) {
  return prisma.volunteerAssignment.update({ where: { id }, data, include });
}
