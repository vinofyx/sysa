import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findMany(params: {
  skip?: number;
  take?: number;
  eventId?: string;
  status?: string;
}) {
  const where: Prisma.EventRegistrationWhereInput = {
    ...(params.eventId ? { eventId: params.eventId } : {}),
    ...(params.status
      ? { status: params.status as Prisma.EnumEventRegistrationStatusFilter['equals'] }
      : {}),
  };
  return Promise.all([
    prisma.eventRegistration.findMany({
      where,
      include: { event: true },
      orderBy: { registeredAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.eventRegistration.count({ where }),
  ]);
}

export function findById(id: string) {
  return prisma.eventRegistration.findUnique({ where: { id }, include: { event: true } });
}

export function countForEvent(eventId: string) {
  return prisma.eventRegistration.count({ where: { eventId, status: 'registered' } });
}

export function create(data: Prisma.EventRegistrationCreateInput) {
  return prisma.eventRegistration.create({ data, include: { event: true } });
}

export function updateStatus(id: string, status: 'registered' | 'cancelled' | 'waitlisted') {
  return prisma.eventRegistration.update({ where: { id }, data: { status } });
}

export function checkIn(id: string) {
  return prisma.eventRegistration.update({
    where: { id },
    data: { checkedIn: true, checkedInAt: new Date() },
  });
}
