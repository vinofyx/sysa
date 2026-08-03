import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@middleware/authenticate.middleware';
import { requirePermission } from '@middleware/authorize.middleware';
import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  createManualDonationSchema,
  listDonationsQuerySchema,
  updateDonationStatusSchema,
  analyticsQuerySchema,
} from '@validation/donation.schema';
import * as donationService from '@services/donation.service';

export const donationsRouter = Router();

donationsRouter.use(authenticate);

donationsRouter.get(
  '/',
  requirePermission('donations:view'),
  validate({ query: listDonationsQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listDonationsQuerySchema>;
      const { page, pageSize, ...filters } = query;
      const result = await donationService.listDonations(filters, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);

donationsRouter.get(
  '/analytics',
  requirePermission('donations:view'),
  validate({ query: analyticsQuerySchema }),
  async (req, res, next) => {
    try {
      const { dateFrom, dateTo } = req.query as unknown as z.infer<typeof analyticsQuerySchema>;
      const analytics = await donationService.getDonationAnalytics(dateFrom, dateTo);
      res.status(200).json({ analytics });
    } catch (error) {
      next(error);
    }
  },
);

donationsRouter.get(
  '/export',
  requirePermission('donations:export'),
  validate({ query: listDonationsQuerySchema }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as z.infer<typeof listDonationsQuerySchema>;
      const { page: _page, pageSize: _pageSize, ...filters } = query;
      const csv = await donationService.exportDonationsCsv(filters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="donations.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },
);

donationsRouter.get(
  '/:id',
  requirePermission('donations:view'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const donation = await donationService.getDonation(id);
      res.status(200).json({ data: donation });
    } catch (error) {
      next(error);
    }
  },
);

donationsRouter.post(
  '/manual',
  requirePermission('donations:create_manual'),
  validate({ body: createManualDonationSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof createManualDonationSchema>;
      const donation = await donationService.createManualDonation(input, req.user!.id);
      res.status(201).json({ data: donation });
    } catch (error) {
      next(error);
    }
  },
);

donationsRouter.patch(
  '/:id/status',
  requirePermission('donations:flag_refund'),
  validate({ params: idParamSchema, body: updateDonationStatusSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { status, internalNote } = req.body as z.infer<typeof updateDonationStatusSchema>;
      const donation = await donationService.updateDonationStatus(
        id,
        status,
        internalNote,
        req.user!.id,
      );
      res.status(200).json({ data: donation });
    } catch (error) {
      next(error);
    }
  },
);
