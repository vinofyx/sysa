import { z } from 'zod';

import { isValidIndianMobile } from '@utils/mobile';

/** Shared donor fields for both a one-time checkout and a recurring
 * subscription — mobile is the primary identification field (required),
 * email is an optional additional contact channel. PAN/Aadhaar are for the
 * donation receipt only; neither is ever forwarded to Razorpay
 * (razorpay-order.service.ts / subscription.service.ts only ever send
 * amount/currency/receipt/notes — never touched by this schema). */
const donorFieldsSchema = z.object({
  donorName: z.string().min(1, 'Required').max(150),
  donorPhone: z.string().refine(isValidIndianMobile, 'Valid Indian mobile number required'),
  donorEmail: z.string().email('Valid email required').optional(),
  // Both PAN and Aadhaar are mandatory (donor/tax reporting requirement) —
  // previously either/or, changed per explicit client instruction.
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format'),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  donorAddress: z.string().max(300).optional(),
  donorCity: z.string().max(100).optional(),
  donorPincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
    .optional(),
  donorState: z.string().max(100).optional(),
});

/** FR-DON-02: category, amount, donor identity — guest checkout, no account
 * required. */
export const initiateDonationSchema = donorFieldsSchema.extend({
  categoryId: z.string().uuid(),
  appealId: z.string().uuid().optional(),
  // Razorpay's own minimum order amount for INR is ₹1 (100 paise) — enforcing
  // it here gives a clean validation error instead of letting a sub-₹1 amount
  // reach `createOrder()`, where it would surface as Razorpay's own rejection
  // and get flattened into razorpay-order.service.ts's generic
  // "unable to reach the payment gateway" catch-all.
  amount: z.coerce
    .number()
    .min(1, 'Minimum donation amount is ₹1')
    .max(10_000_000, 'Amount is too large'),
  /** One per checkout attempt, generated client-side — makes retrying this
   * endpoint after a network failure safe (documentation/13-API-Requirements.md §7). */
  idempotencyKey: z.string().min(8).max(100),
});

/** Creates a Razorpay Subscription (automatic monthly contribution) —
 * separate endpoint from `initiateDonationSchema`/`/donations/initiate` so
 * the existing one-time order-based checkout is never touched. */
export const createSubscriptionSchema = donorFieldsSchema.extend({
  categoryId: z.string().uuid(),
  amount: z.coerce
    .number()
    .min(1, 'Minimum donation amount is ₹1')
    .max(10_000_000, 'Amount is too large'),
});

export const verifySubscriptionSchema = z.object({
  subscriptionRecordId: z.string().uuid(),
  razorpayPaymentId: z.string().min(1),
  razorpaySubscriptionId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  donationId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const donationTokenQuerySchema = z.object({
  token: z.string().min(1).optional(),
});

export const requestDonorOtpSchema = z.object({
  email: z.string().email(),
});

export const verifyDonorOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
