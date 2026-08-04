import { Router, type Request } from 'express';

import { ApiError } from '@utils/api-error';
import { processRazorpayWebhook } from '@services/webhook.service';

export const webhooksRouter = Router();

/**
 * Not rate-limited or session-authenticated by design — trust comes entirely
 * from the HMAC signature check inside `processRazorpayWebhook`
 * (documentation/13-API-Requirements.md §5.1). No user-facing rate limit
 * should ever cause a legitimate Razorpay delivery to be dropped.
 */
webhooksRouter.post('/razorpay', async (req, res, next) => {
  try {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) throw ApiError.badRequest('Missing request body');

    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    await processRazorpayWebhook(rawBody, signature);

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});
