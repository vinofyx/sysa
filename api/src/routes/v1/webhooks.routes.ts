import { Router, type Request, type Response, type NextFunction } from 'express';

import { ApiError } from '@utils/api-error';
import { processRazorpayWebhook } from '@services/webhook.service';

export const webhooksRouter = Router();

/**
 * Shared Razorpay webhook handler — mounted at both `POST /webhooks/razorpay`
 * (historical dashboard URL) and `POST /donations/razorpay-webhook` (spec
 * alias). Not rate-limited or session-authenticated; trust comes entirely
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
