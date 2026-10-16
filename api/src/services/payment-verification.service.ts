import { Prisma } from '@prisma/client';

import { writeAuditLog } from '@lib/audit-log';
import { logger } from '@lib/logger';
import { verifyPaymentSignature } from '@lib/razorpay-signature';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as appealRepo from '@repositories/appeal.repository';
import { fetchPayment } from '@services/razorpay-order.service';
import { issueReceipt } from '@services/receipt.service';

/** Razorpay's `payment.method` values, narrowed to the subset our
 * `PaymentMethod` enum models. EMI is still fundamentally a card charge, and
 * any future/unrecognized Razorpay method falls back to `card` rather than
 * failing an otherwise-successful, already-captured payment. */
export function mapRazorpayMethod(method: string): 'upi' | 'card' | 'netbanking' | 'wallet' {
  switch (method) {
    case 'upi':
      return 'upi';
    case 'netbanking':
      return 'netbanking';
    case 'wallet':
      return 'wallet';
    case 'card':
    case 'emi':
    default:
      return 'card';
  }
}

/**
 * Shared "complete the donation" core — fetches the payment from Razorpay
 * (server-to-server, so we never trust a client-reported status), marks it
 * completed, recalculates any linked appeal total, and issues the receipt.
 *
 * Called from two different trust boundaries that MUST NOT be conflated:
 *  - the synchronous `/donations/verify` endpoint, after checking the
 *    Checkout `razorpay_signature` (see `verifyAndCompletePayment` below);
 *  - the `payment.captured` webhook, whose trust comes from the separate
 *    webhook HMAC already checked in `webhook.service.ts` — it never
 *    receives a Checkout signature, so it calls this directly.
 * Idempotent either way: whichever arrives first wins, the other is a no-op.
 */
export async function completeDonationFromPayment(
  donationId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string,
) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');
  if (donation.status === 'completed') {
    // A second arrival (verify after webhook, or vice versa) must still be
    // able to retry receipt PDF/email/WhatsApp without touching the payment.
    try {
      await issueReceipt(donation.id);
    } catch (error) {
      logger.error('Receipt issuance failed for already-captured payment', {
        donationId: donation.id,
        error: error instanceof Error ? error.message : error,
      });
    }
    return donation;
  }

  const duplicate = await donationRepo.findByPaymentGatewayRef(razorpayPaymentId);
  if (duplicate && duplicate.id !== donation.id) {
    throw ApiError.conflict('This payment has already been recorded against another donation.');
  }

  const payment = await fetchPayment(razorpayPaymentId);
  if (payment.status !== 'captured') {
    await donationRepo.markFailed(donation.id, `Payment not captured (status: ${payment.status})`);
    await writeAuditLog({
      action: 'PAYMENT_FAILED',
      entityType: 'donation',
      entityId: donation.id,
      afterState: { razorpayStatus: payment.status },
    });
    throw ApiError.badRequest(`Payment was not captured (status: ${payment.status}).`);
  }

  // A captured payment is only proof for THIS donation if it was made against
  // this donation's order, for exactly its amount and currency. On mismatch
  // nothing is completed or receipted; the donation stays pending (money may
  // really have been captured) for Finance to review via the audit log.
  const mismatch = paymentMismatch(donation, payment);
  if (mismatch) {
    logger.error('Captured payment does not match donation — not completing', {
      donationId: donation.id,
      paymentId: razorpayPaymentId,
      mismatch,
    });
    await writeAuditLog({
      action: 'PAYMENT_MISMATCH',
      entityType: 'donation',
      entityId: donation.id,
      afterState: { paymentId: razorpayPaymentId, mismatch },
    });
    throw ApiError.conflict('Payment details do not match this donation. Please contact us.');
  }

  // `payment` was already fetched above to check `status === 'captured'` —
  // its `fee`/`tax` (paise, present on every captured payment) are free to
  // capture here too, no extra Razorpay call. Purely informational
  // (payment_details_page); never affects whether the donation completes.
  const feePaise = (payment as unknown as { fee?: number | null }).fee;
  const taxPaise = (payment as unknown as { tax?: number | null }).tax;
  const razorpayFee = typeof feePaise === 'number' ? feePaise / 100 : null;
  const razorpayTax = typeof taxPaise === 'number' ? taxPaise / 100 : null;
  const netAmount =
    razorpayFee != null && razorpayTax != null
      ? Number(donation.amount) - razorpayFee - razorpayTax
      : null;

  let updated;
  try {
    updated = await donationRepo.markCompletedFromPayment(donation.id, {
      paymentMethod: mapRazorpayMethod(payment.method),
      paymentGatewayRef: razorpayPaymentId,
      razorpaySignature,
      razorpayPaymentStatus: payment.status,
      razorpayFee,
      razorpayTax,
      netAmount,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw ApiError.conflict('This payment has already been recorded against another donation.');
    }
    throw error;
  }

  if (updated.appealId) {
    await appealRepo.recalculateRaisedAmount(updated.appealId);
  }

  try {
    await issueReceipt(updated.id);
  } catch (error) {
    logger.error('Receipt issuance failed after captured payment', {
      donationId: updated.id,
      error: error instanceof Error ? error.message : error,
    });
  }

  await writeAuditLog({
    action: 'PAYMENT_VERIFIED',
    entityType: 'donation',
    entityId: updated.id,
    afterState: { amount: Number(updated.amount), paymentId: razorpayPaymentId },
  });

  return updated;
}

/** Returns which of order id / amount / currency differ (names only — no
 * amounts or ids, so it is safe to log), or null when they all match. */
export function paymentMismatch(
  donation: { razorpayOrderId: string | null; amount: unknown; currency: string },
  payment: { order_id?: string | null; amount?: number | string | null; currency?: string | null },
): string[] | null {
  const problems: string[] = [];
  if (donation.razorpayOrderId && payment.order_id !== donation.razorpayOrderId) {
    problems.push('order_id');
  }
  const expectedPaise = Math.round(Number(donation.amount) * 100);
  if (Number(payment.amount) !== expectedPaise) problems.push('amount');
  if ((payment.currency ?? '').toUpperCase() !== donation.currency.toUpperCase()) {
    problems.push('currency');
  }
  return problems.length > 0 ? problems : null;
}

export interface VerifyPaymentInput {
  donationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * `POST /donations/verify` — the browser calls this immediately after
 * Razorpay Checkout's success handler fires, carrying the
 * order/payment/signature triple Checkout returned to the page.
 */
export async function verifyAndCompletePayment(input: VerifyPaymentInput) {
  const donation = await donationRepo.findById(input.donationId);
  if (!donation) throw ApiError.notFound('Donation not found');

  if (donation.razorpayOrderId !== input.razorpayOrderId) {
    throw ApiError.badRequest('Order does not match this donation.');
  }

  if (donation.status === 'completed') {
    try {
      await issueReceipt(donation.id);
    } catch (error) {
      logger.error('Receipt issuance failed for already-captured payment', {
        donationId: donation.id,
        error: error instanceof Error ? error.message : error,
      });
    }
    return donation; // idempotent — already completed by the webhook or a prior call
  }

  const validSignature = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!validSignature) {
    await donationRepo.markFailed(donation.id, 'Signature verification failed');
    await writeAuditLog({
      action: 'PAYMENT_SIGNATURE_INVALID',
      entityType: 'donation',
      entityId: donation.id,
    });
    throw ApiError.badRequest('Payment verification failed. Please try again or contact us.');
  }

  return completeDonationFromPayment(donation.id, input.razorpayPaymentId, input.razorpaySignature);
}
