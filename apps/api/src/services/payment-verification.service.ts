import { Prisma } from '@prisma/client';

import { writeAuditLog } from '@lib/audit-log';
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
function mapRazorpayMethod(method: string): 'upi' | 'card' | 'netbanking' | 'wallet' {
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
  if (donation.status === 'completed') return donation;

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

  let updated;
  try {
    updated = await donationRepo.markCompletedFromPayment(donation.id, {
      paymentMethod: mapRazorpayMethod(payment.method),
      paymentGatewayRef: razorpayPaymentId,
      razorpaySignature,
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

  await issueReceipt(updated.id);

  await writeAuditLog({
    action: 'PAYMENT_VERIFIED',
    entityType: 'donation',
    entityId: updated.id,
    afterState: { amount: Number(updated.amount), paymentId: razorpayPaymentId },
  });

  return updated;
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
