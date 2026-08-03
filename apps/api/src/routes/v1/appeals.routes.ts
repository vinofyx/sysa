import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createAppealSchema,
  listAppealsQuerySchema,
  updateAppealSchema,
} from '@validation/appeal.schema';
import * as appealService from '@services/appeal.service';
import { prisma } from '@lib/prisma';

export const appealsRouter = Router();

// Public: the Appeals & Current Needs page (once built) shows active campaigns.
appealsRouter.get('/public', async (_req, res, next) => {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { status: 'active' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ appeals });
  } catch (error) {
    next(error);
  }
});

appealsRouter.use(authenticate);

appealsRouter.get(
  '/',
  requirePermission('appeals:view'),
  validate({ query: listAppealsQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize, status } = req.query as unknown as z.infer<
        typeof listAppealsQuerySchema
      >;
      const result = await appealService.listAppeals(page, pageSize, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

appealsRouter.get(
  '/:id',
  requirePermission('appeals:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const appeal = await appealService.getAppeal(id);
      res.status(200).json({ data: appeal });
    } catch (error) {
      next(error);
    }
  },
);

appealsRouter.post(
  '/',
  requirePermission('appeals:manage'),
  validate({ body: createAppealSchema }),
  async (req, res, next) => {
    try {
      const appeal = await appealService.createAppeal(req.body, req.user!.id);
      res.status(201).json({ data: appeal });
    } catch (error) {
      next(error);
    }
  },
);

appealsRouter.patch(
  '/:id',
  requirePermission('appeals:manage'),
  validate({ params: idParamSchema, body: updateAppealSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const appeal = await appealService.updateAppeal(id, req.body, req.user!.id);
      res.status(200).json({ data: appeal });
    } catch (error) {
      next(error);
    }
  },
);

appealsRouter.delete(
  '/:id',
  requirePermission('appeals:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await appealService.archiveAppeal(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
