import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { validate } from '@middleware/validate.middleware';
import { idParamSchema } from '@validation/common.schema';
import {
  initiateDonationSchema,
  verifyPaymentSchema,
  donationTokenQuerySchema,
  createSubscriptionSchema,
  verifySubscriptionSchema,
} from '@validation/donation-checkout.schema';
import { ACCESS_TOKEN_COOKIE, DONOR_TOKEN_COOKIE } from '@config/constants';
import { verifyAccessToken } from '@lib/jwt';
import {
  verifyDonorToken,
  verifyDonationAccessToken,
  verifyReceiptAccessToken,
} from '@lib/donor-jwt';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as subscriptionRepo from '@repositories/donor-subscription.repository';
import * as checkoutService from '@services/donation-checkout.service';
import * as subscriptionService from '@services/subscription.service';
import { verifyAndCompletePayment } from '@services/payment-verification.service';
import {
  retryFailedDeliveries,
  retryReceiptEmail,
  retryReceiptSms,
  retryReceiptWhatsApp,
} from '@services/receipt.service';
import { handleRazorpayWebhook } from '@routes/v1/webhooks.routes';
import type { Request } from 'express';

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || undefined;
  }
  return undefined;
}

function donationAccessTokenFrom(req: Request, queryToken?: string): string | undefined {
  return queryToken || bearerToken(req);
}

/** Same "who may act on this donation" contract as `/:id/receipt` below
 * (documentation/13-API-Requirements.md §3.2): the stateless per-donation
 * token (guest checkout success page / mobile app), the donor's own session,
 * an admin session, or the receipt-access token. Query `token`, `Authorization:
 * Bearer`, or auth cookies are all accepted so website and mobile share this
 * API without a second receipt implementation. */
async function isAuthorizedForDonation(
  req: Request,
  donationId: string,
  donorId: string,
  token: string | undefined,
): Promise<boolean> {
  const accessToken = donationAccessTokenFrom(req, token);
  if (
    accessToken &&
    (verifyDonationAccessToken(donationId, accessToken) ||
      verifyReceiptAccessToken(donationId, accessToken))
  ) {
    return true;
  }

  if (accessToken) {
    try {
      if (verifyDonorToken(accessToken).sub === donorId) return true;
    } catch {
      /* not a donor JWT */
    }
    try {
      verifyAccessToken(accessToken);
      return true;
    } catch {
      /* not an admin JWT either */
    }
  }

  const donorCookie = req.cookies?.[DONOR_TOKEN_COOKIE] as string | undefined;
  if (donorCookie) {
    try {
      if (verifyDonorToken(donorCookie).sub === donorId) return true;
    } catch {
      /* fall through to admin check */
    }
  }

  const adminCookie = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  if (adminCookie) {
    try {
      verifyAccessToken(adminCookie);
      return true;
    } catch {
      /* not a valid admin session either */
    }
  }

  return false;
}

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

donationCheckoutRouter.post('/razorpay-webhook', handleRazorpayWebhook);

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
      const receiptView = await checkoutService.getDonationStatus(donation.id);
      res.status(200).json({
        data: {
          id: donation.id,
          status: donation.status,
          receiptNumber: receiptView.receiptNumber,
          receiptUrl: receiptView.receiptUrl,
          emailStatus: receiptView.emailStatus,
          whatsappStatus: receiptView.whatsappStatus,
          smsStatus: receiptView.smsStatus,
          emailSentAt: receiptView.emailSentAt,
          whatsappSentAt: receiptView.whatsappSentAt,
          emailFailureReason: receiptView.emailFailureReason,
          whatsappFailureReason: receiptView.whatsappFailureReason,
          receiptGenerated: receiptView.receiptGenerated,
        },
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

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

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

      // The stateless HMAC token above (no expiry) is still what the browser
      // uses right after checkout; a time-limited JWT variant is what the
      // SMS/WhatsApp receipt link uses instead (signReceiptAccessToken —
      // MOBILE_RECEIPT_DELIVERY.security requires it not be permanent).
      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

      const receipt = await checkoutService.getDonationReceiptView(id);
      res.status(200).json({ data: receipt });
    } catch (error) {
      next(error);
    }
  },
);

// Deliberately tighter than `checkoutLimiter` — this never creates a
// donation/payment, but each call does trigger a real outbound SMS-provider
// request once one is configured, so it needs its own low-frequency cap
// (retry_sms.requirements: "prevent excessive repeated SMS requests").
const smsRetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

donationCheckoutRouter.post(
  '/:id/retry-sms',
  smsRetryLimiter,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

      const smsStatus = await retryReceiptSms(id);
      res.status(200).json({ data: { smsStatus } });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/:id/retry-email',
  smsRetryLimiter,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

      const emailStatus = await retryReceiptEmail(id);
      res.status(200).json({ data: { emailStatus } });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/:id/retry-whatsapp',
  smsRetryLimiter,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

      const whatsappStatus = await retryReceiptWhatsApp(id);
      res.status(200).json({ data: { whatsappStatus } });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/:id/retry-deliveries',
  smsRetryLimiter,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const donation = await donationRepo.findById(id);
      if (!donation) throw ApiError.notFound('Donation not found');

      const authorized = await isAuthorizedForDonation(req, id, donation.donorId, token);
      if (!authorized) throw ApiError.unauthorized();

      const result = await retryFailedDeliveries(id);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * MONTHLY_CONTRIBUTION.automatic_monthly — creates a Razorpay Subscription
 * mandate. Entirely separate from `/initiate`/`/verify` above (the one-time
 * Orders flow), which this never touches.
 */
donationCheckoutRouter.post(
  '/subscriptions',
  checkoutLimiter,
  validate({ body: createSubscriptionSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof createSubscriptionSchema>;
      const session = await subscriptionService.createSubscription(input);
      res.status(201).json({ data: session });
    } catch (error) {
      next(error);
    }
  },
);

donationCheckoutRouter.post(
  '/subscriptions/verify',
  checkoutLimiter,
  validate({ body: verifySubscriptionSchema }),
  async (req, res, next) => {
    try {
      const input = req.body as z.infer<typeof verifySubscriptionSchema>;
      const result = await subscriptionService.verifyAndActivateSubscription(input);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

// Same guest-token / donor-session / admin-session authorization pattern as
// `/:id/receipt` above.
donationCheckoutRouter.post(
  '/subscriptions/:id/cancel',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const token = req.query.token as string | undefined;

      const subscription = await subscriptionRepo.findById(id);
      if (!subscription) throw ApiError.notFound('Subscription not found');

      let authorized = !!token && verifyDonationAccessToken(id, token);

      if (!authorized) {
        const donorCookie = req.cookies?.[DONOR_TOKEN_COOKIE] as string | undefined;
        if (donorCookie) {
          try {
            authorized = verifyDonorToken(donorCookie).sub === subscription.donorId;
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

      const updated = await subscriptionService.cancelSubscription(id);
      res.status(200).json({ data: { id: updated.id, status: updated.status } });
    } catch (error) {
      next(error);
    }
  },
);
