import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { ApiError } from '@utils/api-error';

/** Thin wrapper around the Razorpay Subscriptions API — server-to-server,
 * mirroring razorpay-order.service.ts's shape exactly. A fresh Plan is
 * created per subscription (amounts are donor-chosen, not a fixed catalog),
 * which is Razorpay's own documented pattern for custom-amount recurring
 * donations — plans have no ongoing cost and aren't user-visible. */
export async function createPlan(input: {
  amountPaise: number;
  currency: string;
  categoryName: string;
}) {
  const client = getRazorpayClient();
  try {
    return await client.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `Monthly Contribution — ${input.categoryName}`,
        amount: input.amountPaise,
        currency: input.currency,
      },
    });
  } catch {
    throw ApiError.internal('Unable to reach the payment gateway. Please try again.');
  }
}

/** `total_count: 120` (10 years of monthly charges) is Razorpay's standard
 * pattern for an "until cancelled" recurring subscription — the donor or
 * admin can cancel at any time via `cancelSubscription`; it's not a
 * commitment to 120 charges. */
export async function createSubscription(input: { planId: string; notes: Record<string, string> }) {
  const client = getRazorpayClient();
  try {
    return await client.subscriptions.create({
      plan_id: input.planId,
      customer_notify: 1,
      total_count: 120,
      quantity: 1,
      notes: input.notes,
    });
  } catch {
    throw ApiError.internal('Unable to reach the payment gateway. Please try again.');
  }
}

export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false) {
  const client = getRazorpayClient();
  try {
    return await client.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  } catch {
    throw ApiError.internal('Unable to reach the payment gateway. Please try again.');
  }
}
