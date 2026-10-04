import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import { listSubscriptionsQuerySchema } from '@validation/donation.schema';
import { paginate } from '@utils/pagination';

import * as subscriptionRepo from '@repositories/donor-subscription.repository';
import * as subscriptionService from '@services/subscription.service';

/** Admin-only read/manage view over `DonorSubscription` (ADMIN_REPORTING —
 * "Monthly Donors" view). Reuses the existing `donations:view`/
 * `donations:manage` permissions rather than introducing new ones. */
export const donorSubscriptionsRouter = Router();

donorSubscriptionsRouter.use(authenticate);

donorSubscriptionsRouter.get(
  '/',
  requirePermission('donations:view'),
  validate({ query: listSubscriptionsQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listSubscriptionsQuerySchema>;
      const { page, pageSize, ...filters } = query;
      const [items, total] = await subscriptionRepo.findMany({
        ...filters,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      res.status(200).json(paginate(items, total, { page, pageSize }));
    } catch (error) {
      next(error);
    }
  },
);

donorSubscriptionsRouter.post(
  '/:id/cancel',
  requirePermission('donations:manage'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const updated = await subscriptionService.cancelSubscription(id);
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  },
);
