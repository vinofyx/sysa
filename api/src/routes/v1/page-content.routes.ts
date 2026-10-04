import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { pageKeyParamSchema, updatePageContentSchema } from '@validation/page-content.schema';
import * as pageContentService from '@services/page-content.service';

export const pageContentRouter = Router();

// Public: the storefront reads published page content without auth.
pageContentRouter.get(
  '/public/:pageKey',
  validate({ params: pageKeyParamSchema }),
  async (req, res, next) => {
    try {
      const { pageKey } = req.params as unknown as z.infer<typeof pageKeyParamSchema>;
      const content = await pageContentService.getPageContent(pageKey);
      res.status(200).json({ content });
    } catch (error) {
      next(error);
    }
  },
);

pageContentRouter.use(authenticate);

pageContentRouter.get('/', requirePermission('content:view'), async (_req, res, next) => {
  try {
    const pages = await pageContentService.listAllPageContent();
    res.status(200).json({ pages });
  } catch (error) {
    next(error);
  }
});

pageContentRouter.get(
  '/:pageKey',
  requirePermission('content:view'),
  validate({ params: pageKeyParamSchema }),
  async (req, res, next) => {
    try {
      const { pageKey } = req.params as unknown as z.infer<typeof pageKeyParamSchema>;
      const content = await pageContentService.getPageContent(pageKey);
      res.status(200).json({ content });
    } catch (error) {
      next(error);
    }
  },
);

pageContentRouter.patch(
  '/:pageKey',
  requirePermission('content:edit'),
  validate({ params: pageKeyParamSchema, body: updatePageContentSchema }),
  async (req, res, next) => {
    try {
      const { pageKey } = req.params as unknown as z.infer<typeof pageKeyParamSchema>;
      const input = req.body as z.infer<typeof updatePageContentSchema>;
      const content = await pageContentService.updatePageContent(pageKey, input, req.user!.id);
      res.status(200).json({ content });
    } catch (error) {
      next(error);
    }
  },
);
