import { z } from 'zod';

export const paymentMethodSchema = z.enum([
  'upi',
  'card',
  'netbanking',
  'wallet',
  'bank_transfer_manual',
  'cash',
  'cheque',
]);

export const donationFrequencySchema = z.enum(['one_time', 'monthly']);
export const donationStatusSchema = z.enum(['pending', 'completed', 'failed', 'refunded']);

export const createManualDonationSchema = z.object({
  donorName: z.string().min(1).max(150),
  donorEmail: z.string().email(),
  donorPhone: z.string().max(20).optional(),
  categoryId: z.string().uuid(),
  appealId: z.string().uuid().optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  paymentMethod: paymentMethodSchema,
  frequency: donationFrequencySchema.default('one_time'),
  internalNote: z.string().max(1000).optional(),
});

export const updateDonationStatusSchema = z.object({
  status: donationStatusSchema,
  internalNote: z.string().max(1000).optional(),
});

export const settlementStatusSchema = z.enum([
  'not_settled',
  'pending',
  'settled',
  'failed',
  'unknown',
]);

export const listDonationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: donationStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  source: z.enum(['online', 'manual']).optional(),
  frequency: donationFrequencySchema.optional(),
  donorId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'amount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  settlementStatus: settlementStatusSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  razorpayPaymentId: z.string().max(100).optional(),
  razorpayOrderId: z.string().max(100).optional(),
});

export const analyticsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const subscriptionStatusSchema = z.enum([
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

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: subscriptionStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
});
