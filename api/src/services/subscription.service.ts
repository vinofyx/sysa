import { env } from '@config/env';
import { writeAuditLog } from '@lib/audit-log';
import { signDonationAccessToken } from '@lib/donor-jwt';
import { verifySubscriptionSignature } from '@lib/razorpay-signature';
import { ApiError } from '@utils/api-error';

import * as donationCategoryRepo from '@repositories/donation-category.repository';
import * as subscriptionRepo from '@repositories/donor-subscription.repository';
import { resolveDonor, type DonorIdentityInput } from '@services/donor-resolution.service';
import {
  createPlan,
  createSubscription as createRazorpaySubscription,
  cancelSubscription as cancelRazorpaySubscription,
} from '@services/razorpay-subscription.service';

export interface CreateSubscriptionInput extends DonorIdentityInput {
  categoryId: string;
  amount: number;
}

export interface SubscriptionSession {
  subscriptionRecordId: string;
  razorpaySubscriptionId: string;
  amount: number;
  currency: string;
  keyId: string;
  statusToken: string;
}

/**
 * MONTHLY_CONTRIBUTION.automatic_monthly — creates a Razorpay Plan + Subscription
 * (mandate) for a donor's automatic monthly contribution. Entirely separate
 * from `donation-checkout.service.ts::initiateDonation` (the one-time Orders
 * flow), so that flow is never touched by this addition. The actual Donation
 * row for each recurring charge is created exclusively by the
 * `subscription.charged` webhook (webhook.service.ts) — this function only
 * establishes the mandate.
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<SubscriptionSession> {
  const category = await donationCategoryRepo.findById(input.categoryId);
  if (!category) throw ApiError.badRequest('Selected donation category was not found.');

  const donor = await resolveDonor(input);

  const amountPaise = Math.round(input.amount * 100);
  const plan = await createPlan({ amountPaise, currency: 'INR', categoryName: category.nameEn });
  const razorpaySubscription = await createRazorpaySubscription({
    planId: plan.id,
    // PAN/Aadhaar are deliberately never included here — Razorpay notes are
    // the same place the one-time flow is forbidden from sending them.
    notes: { donorId: donor.id, categoryId: category.id },
  });

  const record = await subscriptionRepo.create({
    donor: { connect: { id: donor.id } },
    category: { connect: { id: category.id } },
    razorpayPlanId: plan.id,
    razorpaySubscriptionId: razorpaySubscription.id,
    amount: input.amount,
    currency: 'INR',
    status: 'created',
  });

  await writeAuditLog({
    action: 'CREATED',
    entityType: 'donor_subscription',
    entityId: record.id,
    afterState: {
      amount: input.amount,
      categoryId: category.id,
      razorpaySubscriptionId: razorpaySubscription.id,
    },
  });

  return {
    subscriptionRecordId: record.id,
    razorpaySubscriptionId: razorpaySubscription.id,
    amount: input.amount,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID ?? '',
    statusToken: signDonationAccessToken(record.id),
  };
}

/**
 * Verifies the signature Razorpay Checkout returns after the subscription's
 * authenticating charge and marks the mandate `authenticated` for immediate
 * UI feedback. Deliberately does NOT create a Donation row or issue a
 * receipt here — `subscription.charged` (webhook.service.ts) is the single
 * source of truth for that, so a race between this endpoint and the webhook
 * can never create a duplicate.
 */
export async function verifyAndActivateSubscription(input: {
  subscriptionRecordId: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}): Promise<{ id: string; status: string }> {
  const record = await subscriptionRepo.findById(input.subscriptionRecordId);
  if (!record) throw ApiError.notFound('Subscription not found');
  if (record.razorpaySubscriptionId !== input.razorpaySubscriptionId) {
    throw ApiError.badRequest('Subscription mismatch.');
  }

  const valid = verifySubscriptionSignature({
    paymentId: input.razorpayPaymentId,
    subscriptionId: input.razorpaySubscriptionId,
    signature: input.razorpaySignature,
  });
  if (!valid) {
    await writeAuditLog({
      action: 'PAYMENT_SIGNATURE_INVALID',
      entityType: 'donor_subscription',
      entityId: record.id,
    });
    throw ApiError.badRequest('Payment verification failed.');
  }

  if (record.status === 'created') {
    const updated = await subscriptionRepo.updateStatus(record.id, 'authenticated');
    await writeAuditLog({
      action: 'VERIFIED',
      entityType: 'donor_subscription',
      entityId: record.id,
    });
    return { id: updated.id, status: updated.status };
  }

  return { id: record.id, status: record.status };
}

/** Donor- or admin-initiated cancellation (MONTHLY_CONTRIBUTION.automatic_monthly
 * "Handle subscription cancellation") — cancels at Razorpay first, only marks
 * our own record cancelled once that succeeds. */
export async function cancelSubscription(subscriptionRecordId: string) {
  const record = await subscriptionRepo.findById(subscriptionRecordId);
  if (!record) throw ApiError.notFound('Subscription not found');
  if (record.status === 'cancelled') return record;

  await cancelRazorpaySubscription(record.razorpaySubscriptionId);
  const updated = await subscriptionRepo.markCancelled(record.id);

  await writeAuditLog({
    action: 'STATUS_CHANGED',
    entityType: 'donor_subscription',
    entityId: record.id,
    afterState: { status: 'cancelled' },
  });

  return updated;
}
