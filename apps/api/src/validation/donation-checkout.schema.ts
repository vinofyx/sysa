import { z } from 'zod';

/** FR-DON-02: category, amount, donor name/email/phone, PAN (optional, for a
 * future 80G receipt) — guest checkout, no account required. */
export const initiateDonationSchema = z.object({
  donorName: z.string().min(1, 'Required').max(150),
  donorEmail: z.string().email('Valid email required'),
  donorPhone: z.string().max(20).optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format')
    .optional(),
  categoryId: z.string().uuid(),
  appealId: z.string().uuid().optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(10_000_000),
  /** One per checkout attempt, generated client-side — makes retrying this
   * endpoint after a network failure safe (documentation/13-API-Requirements.md §7). */
  idempotencyKey: z.string().min(8).max(100),
});

export const verifyPaymentSchema = z.object({
  donationId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const donationTokenQuerySchema = z.object({
  token: z.string().min(1),
});

export const requestDonorOtpSchema = z.object({
  email: z.string().email(),
});

export const verifyDonorOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
