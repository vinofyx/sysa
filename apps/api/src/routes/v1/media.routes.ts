import { Router } from 'express';

import { authenticate } from '@middleware/authenticate.middleware';
import { imageUpload } from '@middleware/upload.middleware';
import { uploadBuffer } from '@integrations/storage/cloudinary-upload';
import { ApiError } from '@utils/api-error';

export const mediaRouter = Router();

/**
 * Generic image-hosting utility for CMS fields that store a plain URL
 * (Hero Banners, Testimonials, Committee Members, Activities — their
 * create/update schemas validate `imageUrl`/`photoUrl` as `z.string().url()`
 * with no dedicated upload endpoint of their own, unlike Gallery/Documents
 * which combine upload+create). Gated by `authenticate` only (no specific
 * permission): it performs no business-entity mutation, only returns a
 * hosted URL — the caller's own resource-level `manage` permission is
 * enforced when that URL is actually saved via the resource's own endpoint.
 */
mediaRouter.post('/upload', authenticate, imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No file uploaded (expected field name "file")');
    const result = await uploadBuffer(req.file.buffer, { folder: 'sysa/cms' });
    res.status(201).json({ url: result.url, publicId: result.publicId });
  } catch (error) {
    next(error);
  }
});
