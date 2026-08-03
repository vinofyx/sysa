import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema, paginationQuerySchema } from '@validation/common.schema';
import {
  createDonationCategorySchema,
  updateDonationCategorySchema,
} from '@validation/donation-category.schema';
import * as donationCategoryService from '@services/donation-category.service';
import { prisma } from '@lib/prisma';

export const donationCategoriesRouter = Router();

// Public: the donation checkout flow (once built) needs categories + pricing without auth.
donationCategoriesRouter.get('/public', async (_req, res, next) => {
  try {
    const categories = await prisma.donationCategory.findMany({
      where: { active: true },
      orderBy: { nameEn: 'asc' },
    });
    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
});

donationCategoriesRouter.use(authenticate);

donationCategoriesRouter.get(
  '/',
  requirePermission('donations:view'),
  validate({ query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query as unknown as z.infer<typeof paginationQuerySchema>;
      const result = await donationCategoryService.listCategories(page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

donationCategoriesRouter.get(
  '/:id',
  requirePermission('donations:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const category = await donationCategoryService.getCategory(id);
      res.status(200).json({ data: category });
    } catch (error) {
      next(error);
    }
  },
);

donationCategoriesRouter.post(
  '/',
  requirePermission('donations:manage'),
  validate({ body: createDonationCategorySchema }),
  async (req, res, next) => {
    try {
      const category = await donationCategoryService.createCategory(req.body, req.user!.id);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  },
);

donationCategoriesRouter.patch(
  '/:id',
  requirePermission('donations:manage'),
  validate({ params: idParamSchema, body: updateDonationCategorySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const category = await donationCategoryService.updateCategory(id, req.body, req.user!.id);
      res.status(200).json({ data: category });
    } catch (error) {
      next(error);
    }
  },
);

donationCategoriesRouter.delete(
  '/:id',
  requirePermission('donations:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await donationCategoryService.deactivateCategory(id, req.user!.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);
