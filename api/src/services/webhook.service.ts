import { createHash } from 'node:crypto';

import { verifyWebhookSignature } from '@lib/razorpay-signature';
import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as webhookEventRepo from '@repositories/payment-webhook-event.repository';
import * as subscriptionRepo from '@repositories/donor-subscription.repository';
import {
  completeDonationFromPayment,
  mapRazorpayMethod,
} from '@services/payment-verification.service';
import { syncDonationPaymentStatus } from '@services/razorpay-settlement.service';
import { issueReceipt } from '@services/receipt.service';

interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string;
  method?: string;
  error_description?: string | null;
}

interface RazorpayWebhookSubscriptionEntity {
  id: string;
  status: string;
  charge_at?: number | null; // Unix seconds
}

interface RazorpayWebhookSettlementEntity {
  id: string;
  status: string;
  amount: number;
  utr?: string | null;
}

interface RazorpayWebhookBody {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookPaymentEntity };
    subscription?: { entity?: RazorpayWebhookSubscriptionEntity };
    settlement?: { entity?: RazorpayWebhookSettlementEntity };
  };
}

/** Razorpay's own subscription-status vocabulary maps 1:1 onto our
 * `SubscriptionStatus` enum (schema.prisma) — this only guards against an
 * unrecognized string ever reaching Prisma's typed `updateStatus`. */
const KNOWN_SUBSCRIPTION_STATUSES = new Set([
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'paused',
  'cancelled',
  'completed',
  'expired',
]);

/**
 * `POST /webhooks/razorpay` — signature-verified, not user-authenticated
 * (documentation/13-API-Requirements.md §3.2). Handles `payment.captured`/
 * `payment.failed` (one-time donations) and the `subscription.*` events
 * (WEBHOOKS.subscription_events) for automatic-monthly contributions; refunds
 * remain intentionally out of scope for this phase. Idempotent via
 * `PaymentWebhookEvent` (eventId = SHA-256 of the raw body), so Razorpay's
 * automatic retries on a slow/failed response never reprocess an event twice
 * (design/13-API-Architecture.md §5).
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
    if (donation) {
      try {
        if (donation.status !== 'completed') {
          await completeDonationFromPayment(donation.id, paymentEntity.id);
        } else {
          // Payment already captured (usually by `/donations/verify`) — still
          // retry receipt generation/email/WhatsApp without touching status.
          await issueReceipt(donation.id);
        }
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
  } else if (body.event === 'subscription.charged') {
    await handleSubscriptionCharged(body);
  } else if (body.event.startsWith('subscription.')) {
    await handleSubscriptionStatusEvent(body);
  } else if (body.event === 'settlement.processed') {
    await handleSettlementProcessed(body);
  }

  await webhookEventRepo.create({
    eventId,
    eventType: body.event,
    payload: rawBody.toString('utf8'),
  });
}

/**
 * `subscription.charged` — the single source of truth for turning a
 * recurring mandate into an actual donation record (MONTHLY_CONTRIBUTION.
 * automatic_monthly: "Track every successful recurring payment as a separate
 * Donation record"). `/subscriptions/verify` (the client-side callback)
 * deliberately never creates a Donation itself, so there's only one writer
 * here and no race to de-duplicate against — this function is still
 * defensive about it (checking `findByPaymentGatewayRef` first) since the
 * `PaymentWebhookEvent` idempotency check above only guards against an exact
 * redelivery of the same event, not a hypothetical second delivery with a
 * different envelope for the same underlying charge.
 */
async function handleSubscriptionCharged(body: RazorpayWebhookBody): Promise<void> {
  const subscriptionEntity = body.payload?.subscription?.entity;
  const paymentEntity = body.payload?.payment?.entity;
  if (!subscriptionEntity?.id || !paymentEntity?.id) return;

  const subscription = await subscriptionRepo.findByRazorpaySubscriptionId(subscriptionEntity.id);
  if (!subscription) {
    logger.error('subscription.charged for unknown subscription', {
      razorpaySubscriptionId: subscriptionEntity.id,
    });
    return;
  }

  const alreadyRecorded = await donationRepo.findByPaymentGatewayRef(paymentEntity.id);
  if (alreadyRecorded) return; // defense in depth — see doc-comment above

  const donation = await donationRepo.create({
    donor: { connect: { id: subscription.donorId } },
    category: { connect: { id: subscription.categoryId } },
    subscription: { connect: { id: subscription.id } },
    amount: subscription.amount,
    currency: subscription.currency,
    source: 'online',
    frequency: 'monthly',
    status: 'completed',
    completedAt: new Date(),
    paymentMethod: paymentEntity.method ? mapRazorpayMethod(paymentEntity.method) : undefined,
    paymentGatewayRef: paymentEntity.id,
  });

  await writeAuditLog({
    action: 'PAYMENT_VERIFIED',
    entityType: 'donation',
    entityId: donation.id,
    afterState: {
      razorpaySubscriptionId: subscriptionEntity.id,
      razorpayPaymentId: paymentEntity.id,
    },
  });

  const nextChargeAt = subscriptionEntity.charge_at
    ? new Date(subscriptionEntity.charge_at * 1000)
    : undefined;
  await subscriptionRepo.updateStatus(subscription.id, 'active', nextChargeAt);

  try {
    await issueReceipt(donation.id);
  } catch (error) {
    logger.error('Receipt issuance failed for subscription charge', {
      donationId: donation.id,
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/** Every other `subscription.*` event — pure status-sync, no Donation/receipt
 * side effects (`activated`, `authenticated`, `pending`, `halted`, `paused`,
 * `resumed`→active, `cancelled`, `completed`, `expired`). */
async function handleSubscriptionStatusEvent(body: RazorpayWebhookBody): Promise<void> {
  const subscriptionEntity = body.payload?.subscription?.entity;
  if (!subscriptionEntity?.id) return;

  const subscription = await subscriptionRepo.findByRazorpaySubscriptionId(subscriptionEntity.id);
  if (!subscription) return;

  // Razorpay's "resumed" event reports the entity status as 'active' already
  // (there's no separate 'resumed' status value) — `subscriptionEntity.status`
  // is always the authoritative current state regardless of which specific
  // event name fired.
  const status = subscriptionEntity.status;
  if (!KNOWN_SUBSCRIPTION_STATUSES.has(status)) {
    logger.warn('Unrecognized Razorpay subscription status', { status, event: body.event });
    return;
  }

  if (status === 'cancelled') {
    await subscriptionRepo.markCancelled(subscription.id);
  } else {
    await subscriptionRepo.updateStatus(
      subscription.id,
      status as
        | 'created'
        | 'authenticated'
        | 'active'
        | 'pending'
        | 'halted'
        | 'paused'
        | 'completed'
        | 'expired',
    );
  }

  await writeAuditLog({
    action: 'STATUS_CHANGED',
    entityType: 'donor_subscription',
    entityId: subscription.id,
    afterState: { status, razorpayEvent: body.event },
  });
}

/**
 * `settlement.processed` fires once for an entire settlement batch, not per
 * payment — Razorpay's webhook payload has no list of which payments it
 * covers. Rather than guess, this triggers a bounded best-effort re-sync
 * (razorpay-settlement.service.ts, the same per-payment settlement-recon
 * lookup the admin "Refresh Payment Status" action uses) over recently
 * completed donations that aren't already confirmed settled. Failures for
 * individual donations are logged and skipped, never thrown — a webhook
 * delivery must still be acknowledged 200 either way (Razorpay retries
 * indefinitely on non-2xx).
 */
async function handleSettlementProcessed(body: RazorpayWebhookBody): Promise<void> {
  const settlementEntity = body.payload?.settlement?.entity;

  const candidates = await donationRepo.findUnsettledCandidates(45);
  let synced = 0;
  for (const { id } of candidates) {
    try {
      await syncDonationPaymentStatus(id);
      synced += 1;
    } catch (error) {
      logger.warn('Settlement sync skipped for one donation', {
        donationId: id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  await writeAuditLog({
    action: 'SETTLEMENT_SYNCED',
    entityType: 'donation',
    afterState: {
      razorpaySettlementId: settlementEntity?.id,
      candidateCount: candidates.length,
      syncedCount: synced,
    },
  });
}
