import { z } from 'zod';

export const createGalleryAlbumSchema = z.object({
  nameEn: z.string().min(1).max(150),
  nameTe: z.string().max(150).optional(),
  category: z.string().max(100).optional(),
  eventId: z.string().uuid().optional(),
  displayOrder: z.number().int().default(0),
});

export const updateGalleryAlbumSchema = createGalleryAlbumSchema.partial();

export const listGalleryAlbumsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().max(100).optional(),
});

export const updateGalleryItemSchema = z.object({
  altTextEn: z.string().max(300).optional(),
  altTextTe: z.string().max(300).optional(),
  displayOrder: z.number().int().optional(),
});

export const reorderGalleryItemsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.number().int() })).min(1),
});

export const albumIdParamSchema = z.object({ albumId: z.string().uuid() });
