import Razorpay from 'razorpay';

import { env } from '@config/env';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';

/**
 * Razorpay SDK client — lazily instantiated (not at module load) so a
 * development environment without live keys can still boot and serve every
 * other route; only the payment-initiation path fails, with a clear error,
 * the same guard pattern as `integrations/storage/cloudinary.client.ts`.
 */
let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (client) return client;

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    logger.warn(
      'Razorpay credentials not configured — online donations will be unavailable until RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are set.',
    );
    throw ApiError.internal(
      'Online payments are not configured yet. Please use the bank transfer option below, or try again later.',
    );
  }

  client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return client;
}

export function isRazorpayConfigured(): boolean {
  return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}
