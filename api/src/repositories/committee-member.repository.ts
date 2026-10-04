import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: { skip?: number; take?: number; active?: boolean }) {
  const where: Prisma.CommitteeMemberWhereInput = {
    deletedAt: null,
    ...(params.active !== undefined ? { active: params.active } : {}),
  };
  return Promise.all([
    prisma.committeeMember.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.committeeMember.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.committeeMember.findFirst({ where: { id, deletedAt: null } });
}

export function create(data: Prisma.CommitteeMemberCreateInput) {
  return prisma.committeeMember.create({ data });
}

export function update(id: string, data: Prisma.CommitteeMemberUpdateInput) {
  return prisma.committeeMember.update({ where: { id }, data });
}

export function softDelete(id: string) {
  return prisma.committeeMember.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function reorder(items: { id: string; displayOrder: number }[]) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.committeeMember.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}
