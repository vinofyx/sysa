import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { ApiError } from '@utils/api-error';

interface CreateOrderInput {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

/** Thin wrapper around the Razorpay Orders API — server-to-server, per
 * design/13-API-Architecture.md §5. Orders API amounts are in the smallest
 * currency unit (paise for INR). */
export async function createOrder(input: CreateOrderInput) {
  const client = getRazorpayClient();
  try {
    return await client.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
  } catch {
    // The Razorpay SDK's own error normalization assumes every rejection
    // carries an HTTP response and throws a confusing raw TypeError when a
    // request fails at the network level (timeout, DNS, connection reset)
    // instead — never let that leak past this boundary.
    throw ApiError.internal('Unable to reach the payment gateway. Please try again.');
  }
}

export async function fetchPayment(paymentId: string) {
  const client = getRazorpayClient();
  try {
    return await client.payments.fetch(paymentId);
  } catch {
    throw ApiError.badRequest('Unable to verify payment with Razorpay.');
  }
}
