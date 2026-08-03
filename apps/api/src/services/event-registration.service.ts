import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as eventRegistrationRepo from '@repositories/event-registration.repository';
import * as eventRepo from '@repositories/event.repository';

export async function registerForEvent(input: {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
}) {
  const event = await eventRepo.findById(input.eventId);
  if (!event || event.status !== 'published') {
    throw ApiError.notFound('Event not found or not open for registration');
  }
  if (event.registrationDeadline && event.registrationDeadline < new Date()) {
    throw ApiError.badRequest('The registration deadline for this event has passed.');
  }

  let status: 'registered' | 'waitlisted' = 'registered';
  if (event.capacity) {
    const currentCount = await eventRegistrationRepo.countForEvent(input.eventId);
    if (currentCount >= event.capacity) {
      status = 'waitlisted';
    }
  }

  return eventRegistrationRepo.create({
    event: { connect: { id: input.eventId } },
    name: input.name,
    email: input.email,
    phone: input.phone,
    status,
  });
}

export async function listRegistrations(
  filters: { eventId?: string; status?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await eventRegistrationRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function checkInRegistration(id: string, checkedInByAdminId: string) {
  const registration = await eventRegistrationRepo.findById(id);
  if (!registration) throw ApiError.notFound('Registration not found');

  const updated = await eventRegistrationRepo.checkIn(id);

  await writeAuditLog({
    adminUserId: checkedInByAdminId,
    action: 'STATUS_CHANGED',
    entityType: 'event_registration',
    entityId: id,
    afterState: { checkedIn: true },
  });

  return updated;
}

export async function cancelRegistration(id: string, cancelledByAdminId: string) {
  const registration = await eventRegistrationRepo.findById(id);
  if (!registration) throw ApiError.notFound('Registration not found');

  const updated = await eventRegistrationRepo.updateStatus(id, 'cancelled');

  await writeAuditLog({
    adminUserId: cancelledByAdminId,
    action: 'STATUS_CHANGED',
    entityType: 'event_registration',
    entityId: id,
    afterState: { status: 'cancelled' },
  });

  return updated;
}
