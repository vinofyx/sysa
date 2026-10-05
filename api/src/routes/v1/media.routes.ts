import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '@middleware/authenticate.middleware';
import { imageUpload, documentUpload } from '@middleware/upload.middleware';
import { uploadBuffer } from '@integrations/storage/cloudinary-upload';
import { ApiError } from '@utils/api-error';

export const mediaRouter = Router();

const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public, rate-limited resume upload for the Volunteer/Internship
 * registration form (`registerVolunteerSchema.resumeUrl` — Phase 6) — the
 * applicant has no session yet, so this can't sit behind `authenticate` like
 * the CMS media utility below. Scoped narrowly (its own folder, document
 * MIME types only) rather than exposing the general-purpose upload publicly.
 */
mediaRouter.post(
  '/upload/resume',
  publicUploadLimiter,
  documentUpload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) throw ApiError.badRequest('No file uploaded (expected field name "file")');
      const result = await uploadBuffer(req.file.buffer, {
        folder: 'sysa/resumes',
        resourceType: 'raw',
      });
      res.status(201).json({ url: result.url, publicId: result.publicId });
    } catch (error) {
      next(error);
    }
  },
);

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
