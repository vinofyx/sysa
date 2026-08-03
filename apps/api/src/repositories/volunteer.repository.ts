import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findByEmail(email: string) {
  return prisma.volunteer.findFirst({ where: { email } });
}

export function findById(id: string) {
  return prisma.volunteer.findUnique({
    where: { id },
    include: { applications: true, assignments: true },
  });
}

export function create(data: Prisma.VolunteerCreateInput) {
  return prisma.volunteer.create({ data });
}

export async function findOrCreate(input: { name: string; email: string; phone: string }) {
  const existing = await findByEmail(input.email);
  if (existing) return existing;
  return create(input);
}

export function findMany(params: { skip?: number; take?: number; search?: string }) {
  const where: Prisma.VolunteerWhereInput = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      }
    : {};
  return Promise.all([
    prisma.volunteer.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
      skip: params.skip,
      take: params.take,
      include: { applications: true },
    }),
    prisma.volunteer.count({ where }),
  ]);
}
