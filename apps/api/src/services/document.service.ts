import type { DocumentCategory } from '@prisma/client';

import { writeAuditLog } from '@lib/audit-log';
import { uploadBuffer, deleteAsset } from '@integrations/storage/cloudinary-upload';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as documentRepo from '@repositories/document-repo.repository';

export async function listDocuments(
  category: DocumentCategory | undefined,
  page: number,
  pageSize: number,
) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await documentRepo.findMany({ skip, take, category });
  return paginate(rows, total, { page, pageSize });
}

export async function listPublicDocuments(category: DocumentCategory | undefined) {
  const [rows] = await documentRepo.findMany({ category, publicVisible: true });
  return rows;
}

export async function getDocument(id: string) {
  const document = await documentRepo.findById(id);
  if (!document) throw ApiError.notFound('Document not found');
  return document;
}

export async function uploadDocument(
  input: {
    category: DocumentCategory;
    titleEn: string;
    titleTe?: string;
    publishedDate?: Date;
    publicVisible: boolean;
  },
  fileBuffer: Buffer,
  uploadedByAdminId: string,
) {
  const result = await uploadBuffer(fileBuffer, {
    folder: `sysa/documents/${input.category}`,
    resourceType: 'raw',
  });

  const document = await documentRepo.create({
    ...input,
    fileUrl: result.url,
    cloudinaryPublicId: result.publicId,
    uploader: { connect: { id: uploadedByAdminId } },
  });

  await writeAuditLog({
    adminUserId: uploadedByAdminId,
    action: 'UPLOADED',
    entityType: 'document',
    entityId: document.id,
    afterState: { category: input.category, titleEn: input.titleEn, publicId: result.publicId },
  });

  return document;
}

export async function updateDocument(
  id: string,
  input: Partial<{ titleEn: string; titleTe: string; publishedDate: Date; publicVisible: boolean }>,
  updatedByAdminId: string,
) {
  const before = await getDocument(id);
  const updated = await documentRepo.update(id, input);
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: input.publicVisible !== undefined ? 'PUBLISHED' : 'UPDATED',
    entityType: 'document',
    entityId: id,
    beforeState: before,
    afterState: input,
  });
  return updated;
}

export async function deleteDocument(id: string, deletedByAdminId: string) {
  const document = await getDocument(id);
  if (document.cloudinaryPublicId) {
    await deleteAsset(document.cloudinaryPublicId, 'raw');
  }
  await documentRepo.softDelete(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'DELETED',
    entityType: 'document',
    entityId: id,
  });
}
