import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  initiateDonationSchema,
  verifyPaymentSchema,
  donationTokenQuerySchema,
} from '@validation/donation-checkout.schema';
import { ACCESS_TOKEN_COOKIE, DONOR_TOKEN_COOKIE } from '@config/constants';
import { verifyAccessToken } from '@lib/jwt';
import { verifyDonorToken, verifyDonationAccessToken } from '@lib/donor-jwt';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as receiptRepo from '@repositories/receipt.repository';
import * as checkoutService from '@services/donation-checkout.service';
import { verifyAndCompletePayment } from '@services/payment-verification.service';

/**
 * Public donation-checkout endpoints — mounted at `/donations` BEFORE the
 * authenticated admin `donationsRouter` (see routes/v1/index.ts), so these
 * specific routes short-circuit before reaching that router's blanket
 * `authenticate` middleware, the same pattern already used for
 * `publicContentRouter` in Phase 6.
 */
export const donationCheckoutRouter = Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

donationCheckoutRouter.post(
  '/initiate',
  checkoutLimiter,
  validate({ body: initiateDonationSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof initiateDonationSchema>;
      const session = await checkoutService.initiateDonation(input);
      res.status(201).json({ data: session });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/verify',
  checkoutLimiter,
  validate({ body: verifyPaymentSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof verifyPaymentSchema>;
      const donation = await verifyAndCompletePayment(input);
      res.status(200).json({
        data: { id: donation.id, status: donation.status },
      });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/:id/retry',
  checkoutLimiter,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const session = await checkoutService.retryDonation(id);
      res.status(200).json({ data: session });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.get(
  '/:id/status',
  validate({ params: idParamSchema, query: donationTokenQuerySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { token } = req.query as unknown as z.infer<typeof donationTokenQuerySchema>;

      if (!verifyDonationAccessToken(id, token)) {
        throw ApiError.unauthorized();
      }

      const status = await checkoutService.getDonationStatus(id);
      res.status(200).json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

// Accepts either the stateless per-donation token (guest checkout) OR a
// donor session (own record) OR an admin session — matching
// documentation/13-API-Requirements.md §3.2's "Donor-authenticated (own
// record) or admin" contract while still supporting the common guest case.
donationCheckoutRouter.get(
  '/:id/receipt',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      let authorized = !!token && verifyDonationAccessToken(id, token);

      if (!authorized) {
        const donorCookie = req.cookies?.[DONOR_TOKEN_COOKIE] as string | undefined;
        if (donorCookie) {
          try {
            authorized = verifyDonorToken(donorCookie).sub === donation.donorId;
          } catch {
            /* fall through to admin check */
          }
        }
      }

      if (!authorized) {
        const adminCookie = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
        if (adminCookie) {
          try {
            verifyAccessToken(adminCookie);
            authorized = true;
          } catch {
            /* not a valid admin session either */
          }
        }
      }

      if (!authorized) throw ApiError.unauthorized();

      const receipt = await receiptRepo.findByDonationId(id);
      if (!receipt?.pdfUrl) throw ApiError.notFound('Receipt is not available yet.');

      res.status(200).json({
        data: { receiptNumber: receipt.receiptNumber, pdfUrl: receipt.pdfUrl },
      });
    } catch (error) {
      next(error);
    }
  },
);
