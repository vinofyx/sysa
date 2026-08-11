import { createHash } from 'node:crypto';

import { verifyWebhookSignature } from '@lib/razorpay-signature';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as webhookEventRepo from '@repositories/payment-webhook-event.repository';
import { completeDonationFromPayment } from '@services/payment-verification.service';

interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string;
  error_description?: string | null;
}

interface RazorpayWebhookBody {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookPaymentEntity };
  };
}

/**
 * `POST /webhooks/razorpay` — signature-verified, not user-authenticated
 * (documentation/13-API-Requirements.md §3.2). Only `payment.captured` and
 * `payment.failed` are handled; refunds are intentionally out of scope for
 * this phase. Idempotent via `PaymentWebhookEvent` (eventId = SHA-256 of the
 * raw body), so Razorpay's automatic retries on a slow/failed response never
 * reprocess an event twice (design/13-API-Architecture.md §5).
 */
export async function processRazorpayWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): Promise<void> {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    await writeAuditLog({
      action: 'WEBHOOK_SIGNATURE_INVALID',
      entityType: 'payment_webhook_event',
    });
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const eventId = createHash('sha256').update(rawBody).digest('hex');
  const alreadyProcessed = await webhookEventRepo.findByEventId(eventId);
  if (alreadyProcessed) return; // 200 OK, no reprocessing — prevents duplicate receipt emails

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookBody;
  } catch {
    throw ApiError.badRequest('Malformed webhook payload');
  }

  await writeAuditLog({
    action: 'WEBHOOK_RECEIVED',
    entityType: 'payment_webhook_event',
    afterState: { eventType: body.event },
  });

  const paymentEntity = body.payload?.payment?.entity;

  if (body.event === 'payment.captured' && paymentEntity?.order_id) {
    const donation = await donationRepo.findByRazorpayOrderId(paymentEntity.order_id);
    if (donation && donation.status !== 'completed') {
      try {
        await completeDonationFromPayment(donation.id, paymentEntity.id);
      } catch (error) {
        // Already logged/audited inside completeDonationFromPayment for the
        // failure cases it recognizes; still ack the webhook below so
        // Razorpay doesn't retry indefinitely for a case we've already handled.
        logger.error('Webhook payment.captured processing failed', {
          donationId: donation.id,
          paymentId: paymentEntity.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  } else if (body.event === 'payment.failed' && paymentEntity?.order_id) {
    const donation = await donationRepo.findByRazorpayOrderId(paymentEntity.order_id);
    if (donation && donation.status === 'pending') {
      await donationRepo.markFailed(
        donation.id,
        paymentEntity.error_description ?? 'Payment failed',
      );
      await writeAuditLog({
        action: 'PAYMENT_FAILED',
        entityType: 'donation',
        entityId: donation.id,
        afterState: { razorpayEvent: body.event },
      });
    }
  }

  await webhookEventRepo.create({
    eventId,
    eventType: body.event,
    payload: rawBody.toString('utf8'),
  });
}
