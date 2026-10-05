import { writeAuditLog } from '@lib/audit-log';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as donationCategoryRepo from '@repositories/donation-category.repository';

export async function listCategories(page: number, pageSize: number, active?: boolean) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await donationCategoryRepo.findMany({ skip, take, active });
  return paginate(rows, total, { page, pageSize });
}

export async function getCategory(id: string) {
  const category = await donationCategoryRepo.findById(id);
  if (!category) throw ApiError.notFound('Donation category not found');
  return category;
}

export async function createCategory(
  input: Parameters<typeof donationCategoryRepo.create>[0],
  createdByAdminId: string,
) {
  const category = await donationCategoryRepo.create(input);
  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'CREATED',
    entityType: 'donation_category',
    entityId: category.id,
    afterState: input as object,
  });
  return category;
}

export async function updateCategory(
  id: string,
  input: Parameters<typeof donationCategoryRepo.update>[1],
  updatedByAdminId: string,
) {
  const before = await getCategory(id);
  const updated = await donationCategoryRepo.update(id, input);
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'UPDATED',
    entityType: 'donation_category',
    entityId: id,
    beforeState: before,
    afterState: input as object,
  });
  return updated;
}

export async function deactivateCategory(id: string, updatedByAdminId: string) {
  await getCategory(id);
  const updated = await donationCategoryRepo.deactivate(id);
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'DELETED',
    entityType: 'donation_category',
    entityId: id,
  });
  return updated;
}
