import { env } from '@config/env';
import { writeAuditLog } from '@lib/audit-log';
import { signDonationAccessToken } from '@lib/donor-jwt';
import { ApiError } from '@utils/api-error';

import * as donationRepo from '@repositories/donation.repository';
import * as donorRepo from '@repositories/donor.repository';
import { createOrder } from '@services/razorpay-order.service';

export interface InitiateDonationInput {
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  panNumber?: string;
  categoryId: string;
  appealId?: string;
  amount: number;
  idempotencyKey: string;
}

export interface CheckoutSession {
  donationId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  statusToken: string;
}

/** Masks all but the last 4 characters — the raw PAN is never stored. */
function maskPan(pan: string): string {
  return `${'*'.repeat(pan.length - 4)}${pan.slice(-4)}`;
}

function toCheckoutSession(
  donationId: string,
  razorpayOrderId: string,
  amount: number,
): CheckoutSession {
  return {
    donationId,
    razorpayOrderId,
    amount,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID ?? '',
    statusToken: signDonationAccessToken(donationId),
  };
}

/**
 * `POST /donations/initiate` — creates the Razorpay order first (so a
 * gateway failure never leaves an orphan pending donation row behind), then
 * the `Donation` row itself. Safe to retry client-side on network failure:
 * a repeated call with the same `idempotencyKey` returns the existing
 * session instead of creating a duplicate (documentation/13-API-Requirements.md §7).
 */
export async function initiateDonation(input: InitiateDonationInput): Promise<CheckoutSession> {
  const existing = await donationRepo.findByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (!existing.razorpayOrderId) {
      throw ApiError.conflict('This donation attempt is no longer valid. Please start again.');
    }
    return toCheckoutSession(existing.id, existing.razorpayOrderId, Number(existing.amount));
  }

  const donor = await donorRepo.findOrCreate({
    name: input.donorName,
    email: input.donorEmail,
    phone: input.donorPhone,
  });
  if (input.panNumber && !donor.panNumberMasked) {
    await donorRepo.update(donor.id, { panNumberMasked: maskPan(input.panNumber) });
  }

  const amountPaise = Math.round(input.amount * 100);
  const order = await createOrder({
    amountPaise,
    currency: 'INR',
    receipt: input.idempotencyKey,
    notes: { idempotencyKey: input.idempotencyKey, categoryId: input.categoryId },
  });

  const donation = await donationRepo.create({
    donor: { connect: { id: donor.id } },
    category: { connect: { id: input.categoryId } },
    ...(input.appealId ? { appeal: { connect: { id: input.appealId } } } : {}),
    amount: input.amount,
    currency: 'INR',
    source: 'online',
    status: 'pending',
    razorpayOrderId: order.id,
    idempotencyKey: input.idempotencyKey,
  });

  await writeAuditLog({
    action: 'PAYMENT_INITIATED',
    entityType: 'donation',
    entityId: donation.id,
    afterState: { amount: input.amount, categoryId: input.categoryId, razorpayOrderId: order.id },
  });

  return toCheckoutSession(donation.id, order.id, input.amount);
}

export async function getDonationStatus(donationId: string) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');

  return {
    id: donation.id,
    status: donation.status,
    amount: Number(donation.amount),
    currency: donation.currency,
    category: donation.category.nameEn,
    failureReason: donation.failureReason,
    receiptAvailable: !!donation.receipt?.pdfUrl,
    razorpayOrderId: donation.razorpayOrderId,
  };
}

/** Reopens a `pending`/`failed` donation for another payment attempt against
 * the SAME Razorpay order — Razorpay orders stay payable across multiple
 * attempts until one is captured, so this never creates a duplicate donation
 * row (satisfies "Prevent Duplicate Payments"). */
export async function retryDonation(donationId: string): Promise<CheckoutSession> {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');
  if (donation.status === 'completed') {
    throw ApiError.conflict('This donation has already been completed.');
  }
  if (!donation.razorpayOrderId) {
    throw ApiError.badRequest('This donation cannot be retried.');
  }

  if (donation.status === 'failed') {
    await donationRepo.resetToPending(donation.id);
  }

  return toCheckoutSession(donation.id, donation.razorpayOrderId, Number(donation.amount));
}
