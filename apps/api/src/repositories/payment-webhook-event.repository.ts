import { prisma } from '@lib/prisma';
import type { Prisma } from '@prisma/client';

export function findByEventId(eventId: string) {
  return prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
}

export function create(data: {
  eventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}) {
  return prisma.paymentWebhookEvent.create({ data });
}
