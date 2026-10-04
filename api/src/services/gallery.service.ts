import { writeAuditLog } from '@lib/audit-log';
import { uploadBuffer, deleteAsset } from '@integrations/storage/cloudinary-upload';
import { toSkipTake, paginate } from '@utils/pagination';
import { ApiError } from '@utils/api-error';

import * as galleryAlbumRepo from '@repositories/gallery-album.repository';
import * as galleryItemRepo from '@repositories/gallery-item.repository';

export async function listAlbums(category: string | undefined, page: number, pageSize: number) {
  const { skip, take } = toSkipTake({ page, pageSize });
  const [rows, total] = await galleryAlbumRepo.findMany({ skip, take, category });
  return paginate(rows, total, { page, pageSize });
}

export async function getAlbum(id: string) {
  const album = await galleryAlbumRepo.findById(id);
  if (!album) throw ApiError.notFound('Gallery album not found');
  return album;
}

export async function createAlbum(
  input: {
    nameEn: string;
    nameTe?: string;
    category?: string;
    eventId?: string;
    displayOrder: number;
  },
  createdByAdminId: string,
) {
  const { eventId, ...rest } = input;
  const album = await galleryAlbumRepo.create({
    ...rest,
    ...(eventId ? { event: { connect: { id: eventId } } } : {}),
  });
  await writeAuditLog({
    adminUserId: createdByAdminId,
    action: 'CREATED',
    entityType: 'gallery_album',
    entityId: album.id,
    afterState: input,
  });
  return album;
}

export async function updateAlbum(
  id: string,
  input: Partial<{
    nameEn: string;
    nameTe: string;
    category: string;
    eventId: string;
    displayOrder: number;
  }>,
  updatedByAdminId: string,
) {
  const before = await getAlbum(id);
  const { eventId, ...rest } = input;
  const updated = await galleryAlbumRepo.update(id, {
    ...rest,
    ...(eventId ? { event: { connect: { id: eventId } } } : {}),
  });
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'UPDATED',
    entityType: 'gallery_album',
    entityId: id,
    beforeState: before,
    afterState: input,
  });
  return updated;
}

export async function deleteAlbum(id: string, deletedByAdminId: string) {
  const album = await getAlbum(id);
  // Clean up every asset in Cloudinary before soft-deleting the album/items —
  // avoids orphaned (billed) media once an album is removed from the CMS.
  for (const item of album.items) {
    if (item.cloudinaryPublicId) {
      await deleteAsset(item.cloudinaryPublicId, item.mediaType === 'video' ? 'raw' : 'image');
    }
    await galleryItemRepo.softDelete(item.id);
  }
  await galleryAlbumRepo.softDelete(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'DELETED',
    entityType: 'gallery_album',
    entityId: id,
  });
}

export async function uploadImageToAlbum(
  albumId: string,
  fileBuffer: Buffer,
  altTextEn: string | undefined,
  uploadedByAdminId: string,
) {
  await getAlbum(albumId); // 404s if the album doesn't exist

  const result = await uploadBuffer(fileBuffer, { folder: `sysa/gallery/${albumId}` });

  const existingItems = await galleryItemRepo.findManyByAlbum(albumId);
  const item = await galleryItemRepo.create({
    album: { connect: { id: albumId } },
    mediaType: 'image',
    mediaUrl: result.url,
    cloudinaryPublicId: result.publicId,
    altTextEn,
    displayOrder: existingItems.length,
  });

  await writeAuditLog({
    adminUserId: uploadedByAdminId,
    action: 'UPLOADED',
    entityType: 'gallery_item',
    entityId: item.id,
    afterState: { albumId, publicId: result.publicId },
  });

  return item;
}

/** Videos are linked (YouTube/Vimeo/external URL), not uploaded as binary
 * assets — see design/07-System-Modules.md §3.7 "Video Gallery: embedded
 * players". */
export async function addVideoToAlbum(
  albumId: string,
  videoUrl: string,
  altTextEn: string | undefined,
  addedByAdminId: string,
) {
  await getAlbum(albumId);
  const existingItems = await galleryItemRepo.findManyByAlbum(albumId);
  const item = await galleryItemRepo.create({
    album: { connect: { id: albumId } },
    mediaType: 'video',
    mediaUrl: videoUrl,
    altTextEn,
    displayOrder: existingItems.length,
  });

  await writeAuditLog({
    adminUserId: addedByAdminId,
    action: 'CREATED',
    entityType: 'gallery_item',
    entityId: item.id,
    afterState: { albumId, videoUrl },
  });

  return item;
}

export async function updateItem(
  id: string,
  input: Partial<{ altTextEn: string; altTextTe: string; displayOrder: number }>,
  updatedByAdminId: string,
) {
  const item = await galleryItemRepo.findById(id);
  if (!item) throw ApiError.notFound('Gallery item not found');
  const updated = await galleryItemRepo.update(id, input);
  await writeAuditLog({
    adminUserId: updatedByAdminId,
    action: 'UPDATED',
    entityType: 'gallery_item',
    entityId: id,
    afterState: input,
  });
  return updated;
}

export async function deleteItem(id: string, deletedByAdminId: string) {
  const item = await galleryItemRepo.findById(id);
  if (!item) throw ApiError.notFound('Gallery item not found');
  if (item.cloudinaryPublicId) {
    await deleteAsset(item.cloudinaryPublicId, item.mediaType === 'video' ? 'raw' : 'image');
  }
  await galleryItemRepo.softDelete(id);
  await writeAuditLog({
    adminUserId: deletedByAdminId,
    action: 'DELETED',
    entityType: 'gallery_item',
    entityId: id,
  });
}

export async function reorderItems(items: { id: string; displayOrder: number }[], adminId: string) {
  await galleryItemRepo.reorder(items);
  await writeAuditLog({
    adminUserId: adminId,
    action: 'REORDERED',
    entityType: 'gallery_item',
  });
}
