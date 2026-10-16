import { Router, type Request, type Response, type NextFunction } from 'express';

import { ApiError } from '@utils/api-error';
import { processRazorpayWebhook } from '@services/webhook.service';
import {
  isAuthorizedDeliveryReport,
  isDeliveryReportEndpointEnabled,
  processWhatsAppDeliveryReport,
} from '@services/whatsapp-delivery-report.service';

export const webhooksRouter = Router();

/**
 * Shared Razorpay webhook handler — mounted at:
 * - `POST /api/v1/payments/razorpay/webhook` (primary Razorpay production webhook URL: https://sysa.in/api/v1/payments/razorpay/webhook)
 * - `POST /api/v1/payments/razorpay`
 * - `POST /api/v1/webhooks/razorpay`
 * - `POST /api/v1/webhooks/razorpay/webhook`
 * - `POST /api/v1/donations/razorpay-webhook` (spec alias)
 *
 * Not rate-limited or session-authenticated; trust comes entirely
 * from the HMAC check inside `processRazorpayWebhook`.
 */
export async function handleRazorpayWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) throw ApiError.badRequest('Missing request body');

    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    await processRazorpayWebhook(rawBody, signature);

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
}

webhooksRouter.post('/razorpay', handleRazorpayWebhook);
webhooksRouter.post('/razorpay/webhook', handleRazorpayWebhook);
webhooksRouter.post('/razorpay-webhook', handleRazorpayWebhook);
webhooksRouter.post('/webhook', handleRazorpayWebhook);

/**
 * `POST /api/v1/webhooks/msg91/whatsapp` — MSG91 WhatsApp delivery reports.
 * Authenticated by the shared MSG91_WEBHOOK_SECRET (header
 * `x-sysa-webhook-token` or `?token=`); 404 while the secret is unset, so the
 * endpoint does not exist until it is deliberately configured. Always 200 for
 * an authenticated call (even if nothing matched) so MSG91 does not retry.
 */
webhooksRouter.post('/msg91/whatsapp', async (req, res, next) => {
  try {
    if (!isDeliveryReportEndpointEnabled()) throw ApiError.notFound('Not found');
    const token =
      req.get('x-sysa-webhook-token') ??
      (typeof req.query.token === 'string' ? req.query.token : undefined);
    if (!isAuthorizedDeliveryReport(token)) throw ApiError.unauthorized();

    const result = await processWhatsAppDeliveryReport(req.body);
    res.status(200).json({ status: 'ok', ...result });
  } catch (error) {
    next(error);
  }
});
