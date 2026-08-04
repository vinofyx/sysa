import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@config/env';
import { ApiError } from '@utils/api-error';

function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Constant-time compare — signature checks must never leak timing info. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the signature Razorpay Checkout returns to the browser after a
 * successful payment (`razorpay_order_id|razorpay_payment_id`, HMAC-SHA256
 * with the key secret) — see design/13-API-Architecture.md §5 and
 * documentation/12-Security-Requirements.md SEC-PAY-01.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw ApiError.internal('Online payments are not configured.');
  }
  const expected = hmacHex(env.RAZORPAY_KEY_SECRET, `${params.orderId}|${params.paymentId}`);
  return safeEqual(expected, params.signature);
}

/**
 * Verifies the `X-Razorpay-Signature` header on inbound webhook deliveries
 * against the raw request body, using the separate webhook secret configured
 * in the Razorpay dashboard (never the same as the API key secret).
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody.toString('utf8'));
  return safeEqual(expected, signature);
}
