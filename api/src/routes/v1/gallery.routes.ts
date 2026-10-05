import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { imageUpload } from '@middleware/upload.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  albumIdParamSchema,
  createGalleryAlbumSchema,
  listGalleryAlbumsQuerySchema,
  reorderGalleryItemsSchema,
  updateGalleryAlbumSchema,
  updateGalleryItemSchema,
} from '@validation/gallery.schema';
import * as galleryService from '@services/gallery.service';
import { ApiError } from '@utils/api-error';
import { prisma } from '@lib/prisma';

export const galleryRouter = Router();

// Public — Gallery page (design/02-Sitemap.md).
galleryRouter.get('/public', async (_req, res, next) => {
  try {
    const albums = await prisma.galleryAlbum.findMany({
      where: { deletedAt: null },
      include: { items: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ albums });
  } catch (error) {
    next(error);
  }
});

galleryRouter.use(authenticate);

galleryRouter.get(
  '/albums',
  requirePermission('gallery:view'),
  validate({ query: listGalleryAlbumsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, category } = req.query as unknown as z.infer<
        typeof listGalleryAlbumsQuerySchema
      >;
      const result = await galleryService.listAlbums(category, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.get(
  '/albums/:id',
  requirePermission('gallery:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const album = await galleryService.getAlbum(id);
      res.status(200).json({ data: album });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.post(
  '/albums',
  requirePermission('gallery:manage'),
  validate({ body: createGalleryAlbumSchema }),
  async (req, res, next) => {
    try {
      const album = await galleryService.createAlbum(req.body, req.user!.id);
      res.status(201).json({ data: album });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.patch(
  '/albums/:id',
  requirePermission('gallery:manage'),
  validate({ params: idParamSchema, body: updateGalleryAlbumSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const album = await galleryService.updateAlbum(id, req.body, req.user!.id);
      res.status(200).json({ data: album });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.delete(
  '/albums/:id',
  requirePermission('gallery:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await galleryService.deleteAlbum(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.post(
  '/albums/:albumId/upload',
  requirePermission('gallery:manage'),
  validate({ params: albumIdParamSchema }),
  imageUpload.single('file'),
  async (req, res, next) => {
    try {
      const { albumId } = req.params as unknown as z.infer<typeof albumIdParamSchema>;
      if (!req.file) throw ApiError.badRequest('No file uploaded (expected field name "file")');
      const altTextEn = req.body.altTextEn as string | undefined;
      const item = await galleryService.uploadImageToAlbum(
        albumId,
        req.file.buffer,
        altTextEn,
        req.user!.id,
      );
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.post(
  '/albums/:albumId/videos',
  requirePermission('gallery:manage'),
  validate({ params: albumIdParamSchema }),
  async (req, res, next) => {
    try {
      const { albumId } = req.params as unknown as z.infer<typeof albumIdParamSchema>;
      const { videoUrl, altTextEn } = req.body as { videoUrl: string; altTextEn?: string };
      if (!videoUrl) throw ApiError.badRequest('videoUrl is required');
      const item = await galleryService.addVideoToAlbum(albumId, videoUrl, altTextEn, req.user!.id);
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.patch(
  '/items/reorder',
  requirePermission('gallery:manage'),
  validate({ body: reorderGalleryItemsSchema }),
  async (req, res, next) => {
    try {
      const { items } = req.body as z.infer<typeof reorderGalleryItemsSchema>;
      await galleryService.reorderItems(items, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.patch(
  '/items/:id',
  requirePermission('gallery:manage'),
  validate({ params: idParamSchema, body: updateGalleryItemSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const item = await galleryService.updateItem(id, req.body, req.user!.id);
      res.status(200).json({ data: item });
    } catch (error) {
      next(error);
    }
  },
);

galleryRouter.delete(
  '/items/:id',
  requirePermission('gallery:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await galleryService.deleteItem(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
