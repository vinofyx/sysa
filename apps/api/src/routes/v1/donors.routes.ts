import { Router } from 'express';
import { z } from 'zod';

import { validate } from '@middleware/validate.middleware';
import { paginationQuerySchema } from '@validation/common.schema';
import { authenticateDonor } from '@middleware/authenticate-donor.middleware';
import * as donorDonationsService from '@services/donor-donations.service';

export const donorsRouter = Router();

donorsRouter.get(
  '/me/donations',
  authenticateDonor,
  validate({ query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query as unknown as z.infer<typeof paginationQuerySchema>;
      const result = await donorDonationsService.listMyDonations(req.donorId!, page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);
