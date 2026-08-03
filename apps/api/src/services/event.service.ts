import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as eventRepo from '@repositories/event.repository';

export async function listEvents(
  filters: { status?: string; categoryId?: string; search?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await eventRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function getEvent(id: string) {
  const event = await eventRepo.findById(id);
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

export async function getPublishedEventBySlug(slug: string) {
  const event = await eventRepo.findBySlug(slug);
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

interface EventInput {
  categoryId?: string;
  titleEn: string;
  titleTe?: string;
  descriptionEn?: string;
  descriptionTe?: string;
  slug: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  capacity?: number;
  registrationDeadline?: Date;
  featuredImageUrl?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  metaTitleEn?: string;
  metaDescriptionEn?: string;
}

export async function createEvent(input: EventInput, createdByAdminId: string) {
  const { categoryId, ...rest } = input;
  const event = await eventRepo.create({
    ...rest,
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    createdByAdmin: { connect: { id: createdByAdminId } },
  });

  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'CREATED',
    entityType: 'event',
    entityId: event.id,
    afterState: input,
  });

  return event;
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
  updatedByAdminId: string,
) {
  const before = await getEvent(id);
  const { categoryId, ...rest } = input;
  const updated = await eventRepo.update(id, {
    ...rest,
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
  });

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: before.status !== input.status && input.status ? 'STATUS_CHANGED' : 'UPDATED',
    entityType: 'event',
    entityId: id,
    beforeState: { status: before.status },
    afterState: input,
  });

  return updated;
}

export async function deleteEvent(id: string, deletedByAdminId: string) {
  await getEvent(id);
  await eventRepo.softDelete(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'DELETED',
    entityType: 'event',
    entityId: id,
  });
}
