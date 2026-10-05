import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as appealRepo from '@repositories/appeal.repository';

export async function listAppeals(page: number, pageSize: number, status?: string) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await appealRepo.findMany({ skip, take, status });
  return paginate(rows, total, { page, pageSize });
}

export async function getAppeal(id: string) {
  const appeal = await appealRepo.findById(id);
  if (!appeal) throw ApiError.notFound('Appeal not found');
  return appeal;
}

export async function createAppeal(
  input: {
    categoryId: string;
    titleEn: string;
    titleTe?: string;
    descriptionEn?: string;
    descriptionTe?: string;
    targetAmount: number;
    startDate?: Date;
    endDate?: Date;
    status: 'active' | 'completed' | 'archived';
  },
  createdByAdminId: string,
) {
  const { categoryId, ...rest } = input;
  const appeal = await appealRepo.create({
    ...rest,
    category: { connect: { id: categoryId } },
  });
  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'CREATED',
    entityType: 'appeal',
    entityId: appeal.id,
    afterState: input,
  });
  return appeal;
}

export async function updateAppeal(
  id: string,
  input: Partial<{
    categoryId: string;
    titleEn: string;
    titleTe: string;
    descriptionEn: string;
    descriptionTe: string;
    targetAmount: number;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'completed' | 'archived';
  }>,
  updatedByAdminId: string,
) {
  const before = await getAppeal(id);
  const { categoryId, ...rest } = input;
  const updated = await appealRepo.update(id, {
    ...rest,
    ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
  });
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'UPDATED',
    entityType: 'appeal',
    entityId: id,
    beforeState: before,
    afterState: input,
  });
  return updated;
}

export async function archiveAppeal(id: string, updatedByAdminId: string) {
  await getAppeal(id);
  const updated = await appealRepo.archive(id);
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'DELETED',
    entityType: 'appeal',
    entityId: id,
  });
  return updated;
}
