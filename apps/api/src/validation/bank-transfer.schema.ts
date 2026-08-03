import { z } from 'zod';

/** Public: a donor's self-reported "I've made a transfer" claim
 * (design/03-User-Flows.md F-03) — no auth required to submit. */
export const submitBankTransferClaimSchema = z.object({
  donorName: z.string().min(1).max(150),
  donorEmail: z.string().email().optional(),
  donorPhone: z.string().max(20).optional(),
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  bankReferenceUtr: z.string().max(100).optional(),
});

export const verifyBankTransferSchema = z.object({
  paymentMethod: z.enum(['upi', 'bank_transfer_manual']).default('bank_transfer_manual'),
});

export const rejectBankTransferSchema = z.object({
  internalNote: z.string().min(1).max(1000),
});

export const listBankTransfersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending_verification', 'verified', 'rejected']).optional(),
});
