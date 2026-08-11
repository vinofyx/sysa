import { prisma } from '@lib/prisma';

export function findByEventId(eventId: string) {
  return prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
}

/** `payload` is stored as raw JSON text (`String @db.LongText` — MySQL has no
 * native Json column type, see MYSQL_MIGRATION_REPORT.md), so callers pass
 * the already-serialized string rather than a parsed object. */
export function create(data: { eventId: string; eventType: string; payload: string }) {
  return prisma.paymentWebhookEvent.create({ data });
}
