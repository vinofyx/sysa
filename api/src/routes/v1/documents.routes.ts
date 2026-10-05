import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { documentUpload } from '@middleware/upload.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createDocumentSchema,
  listDocumentsQuerySchema,
  listPublicDocumentsQuerySchema,
  updateDocumentSchema,
} from '@validation/document.schema';
import * as documentService from '@services/document.service';
import { ApiError } from '@utils/api-error';

export const documentsRouter = Router();

// Public — Download Centre (design/02-Sitemap.md).
documentsRouter.get(
  '/public',
  validate({ query: listPublicDocumentsQuerySchema }),
  async (req, res, next) => {
    try {
      const { category } = req.query as unknown as z.infer<typeof listPublicDocumentsQuerySchema>;
      const documents = await documentService.listPublicDocuments(category);
      res.status(200).json({ data: documents });
    } catch (error) {
      next(error);
    }
  },
);

documentsRouter.use(authenticate);

documentsRouter.get(
  '/',
  requirePermission('documents:view'),
  validate({ query: listDocumentsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, category } = req.query as unknown as z.infer<
        typeof listDocumentsQuerySchema
      >;
      const result = await documentService.listDocuments(category, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

documentsRouter.get(
  '/:id',
  requirePermission('documents:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const document = await documentService.getDocument(id);
      res.status(200).json({ data: document });
    } catch (error) {
      next(error);
    }
  },
);

documentsRouter.post(
  '/',
  requirePermission('documents:upload'),
  documentUpload.single('file'),
  validate({ body: createDocumentSchema }),
  async (req, res, next) => {
    try {
      if (!req.file) throw ApiError.badRequest('No file uploaded (expected field name "file")');
      const document = await documentService.uploadDocument(
        req.body,
        req.file.buffer,
        req.user!.id,
      );
      res.status(201).json({ data: document });
    } catch (error) {
      next(error);
    }
  },
);

documentsRouter.patch(
  '/:id',
  requirePermission('documents:publish'),
  validate({ params: idParamSchema, body: updateDocumentSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const document = await documentService.updateDocument(id, req.body, req.user!.id);
      res.status(200).json({ data: document });
    } catch (error) {
      next(error);
    }
  },
);

documentsRouter.delete(
  '/:id',
  requirePermission('documents:publish'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await documentService.deleteDocument(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
