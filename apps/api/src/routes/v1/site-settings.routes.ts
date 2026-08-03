import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { updateSiteSettingsSchema } from '@validation/site-settings.schema';
import * as siteSettingsService from '@services/site-settings.service';

export const siteSettingsRouter = Router();

// Public: the storefront (once built) needs contact/SEO defaults without auth.
siteSettingsRouter.get('/public', async (_req, res, next) => {
  try {
    const settings = await siteSettingsService.getSiteSettings();
    res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
});

siteSettingsRouter.get(
  '/',
  authenticate,
  requirePermission('settings:view'),
  async (_req, res, next) => {
    try {
      const settings = await siteSettingsService.getSiteSettings();
      res.status(200).json({ settings });
    } catch (error) {
      next(error);
    }
  },
);

siteSettingsRouter.patch(
  '/',
  authenticate,
  requirePermission('settings:manage'),
  validate({ body: updateSiteSettingsSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof updateSiteSettingsSchema>;
      const settings = await siteSettingsService.updateSiteSettings(input, req.user!.id);
      res.status(200).json({ settings });
    } catch (error) {
      next(error);
    }
  },
);
