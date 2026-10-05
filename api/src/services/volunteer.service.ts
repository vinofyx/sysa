import { writeAuditLog } from '@lib/audit-log';
import { prisma } from '@lib/prisma';
import { sendMail } from '@integrations/email/mailer';
import {
  volunteerConfirmationEmail,
  volunteerStatusUpdateEmail,
} from '@integrations/email/templates/volunteer.templates';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as volunteerRepo from '@repositories/volunteer.repository';
import * as volunteerApplicationRepo from '@repositories/volunteer-application.repository';

export interface RegisterVolunteerInput {
  name: string;
  email: string;
  phone: string;
  type: 'volunteer' | 'internship';
  areaOfInterest?: string;
  academicBackground?: string;
  resumeUrl?: string;
}

async function notifyVolunteerCoordinators(subject: string, html: string, text: string) {
  const coordinators = await prisma.adminUser.findMany({
    where: {
      active: true,
      role: { rolePermissions: { some: { permission: { code: 'volunteers:manage_status' } } } },
    },
    select: { email: true },
  });
  await Promise.all(coordinators.map((c) => sendMail({ to: c.email, subject, html, text })));
}

export async function registerVolunteer(input: RegisterVolunteerInput) {
  const volunteer = await volunteerRepo.findOrCreate({
    name: input.name,
    email: input.email,
    phone: input.phone,
  });

  const application = await volunteerApplicationRepo.create({
    volunteer: { connect: { id: volunteer.id } },
    type: input.type,
    areaOfInterest: input.areaOfInterest,
    academicBackground: input.academicBackground,
    resumeUrl: input.resumeUrl,
  });

  const confirmation = volunteerConfirmationEmail({ name: input.name, type: input.type });
  await sendMail({ to: input.email, ...confirmation });

  await notifyVolunteerCoordinators(
    `New ${input.type} application — ${input.name}`,
    `<p>New ${input.type} application from ${input.name} (${input.email}). Review it in the admin dashboard.</p>`,
    `New ${input.type} application from ${input.name} (${input.email}).`,
  );

  return application;
}

export async function listApplications(
  filters: { type?: string; status?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await volunteerApplicationRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function getApplication(id: string) {
  const application = await volunteerApplicationRepo.findById(id);
  if (!application) throw ApiError.notFound('Volunteer application not found');
  return application;
}

export async function updateApplicationStatus(
  id: string,
  status: 'submitted' | 'under_review' | 'accepted' | 'not_selected',
  internalNote: string | undefined,
  reviewedByAdminId: string,
) {
  const before = await getApplication(id);
  const updated = await volunteerApplicationRepo.updateStatus(
    id,
    status,
    reviewedByAdminId,
    internalNote,
  );

  if (status === 'accepted' || status === 'not_selected' || status === 'under_review') {
    const { subject, html, text } = volunteerStatusUpdateEmail({
      name: updated.volunteer.name,
      status,
    });
    await sendMail({ to: updated.volunteer.email, subject, html, text });
  }

  await writeAuditLog({
    adminUserId: reviewedByAdminId,
    action: 'STATUS_CHANGED',
    entityType: 'volunteer_application',
    entityId: id,
    beforeState: { status: before.status },
    afterState: { status, internalNote },
  });

  return updated;
}

export async function listVolunteers(search: string | undefined, page: number, pageSize: number) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await volunteerRepo.findMany({ skip, take, search });
  return paginate(rows, total, { page, pageSize });
}

export async function getVolunteer(id: string) {
  const volunteer = await volunteerRepo.findById(id);
  if (!volunteer) throw ApiError.notFound('Volunteer not found');
  return volunteer;
}
