import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as assignmentRepo from '@repositories/volunteer-assignment.repository';

export async function listAssignments(
  filters: { volunteerId?: string; status?: string },
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await assignmentRepo.findMany({ ...filters, skip, take });
  return paginate(rows, total, { page, pageSize });
}

export async function getAssignment(id: string) {
  const assignment = await assignmentRepo.findById(id);
  if (!assignment) throw ApiError.notFound('Volunteer assignment not found');
  return assignment;
}

export async function createAssignment(
  input: {
    volunteerId: string;
    titleEn: string;
    descriptionEn?: string;
    assignedDate: Date;
    notes?: string;
  },
  assignedByAdminId: string,
) {
  const { volunteerId, ...rest } = input;
  const assignment = await assignmentRepo.create({
    ...rest,
    volunteer: { connect: { id: volunteerId } },
    assignedByAdmin: { connect: { id: assignedByAdminId } },
  });

  await writeAuditLog({
    adminUserId: assignedByAdminId,
    action: 'CREATED',
    entityType: 'volunteer_assignment',
    entityId: assignment.id,
    afterState: input,
  });

  return assignment;
}

export async function updateAssignment(
  id: string,
  input: Partial<{
    titleEn: string;
    descriptionEn: string;
    status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    notes: string;
  }>,
  updatedByAdminId: string,
) {
  const before = await getAssignment(id);
  const updated = await assignmentRepo.update(id, input);

  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'STATUS_CHANGED',
    entityType: 'volunteer_assignment',
    entityId: id,
    beforeState: { status: before.status },
    afterState: input,
  });

  return updated;
}
