import { getRazorpayClient } from '@integrations/payments/razorpay.client';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';
import type { SettlementStatus } from '@prisma/client';

import * as donationRepo from '@repositories/donation.repository';

/**
 * Reads a payment's current status/fee and, separately, whether it has
 * actually been settled to the bank account — two genuinely different
 * Razorpay concepts (payment_details_page/dashboard_summary requirements).
 * Never writes to the Donation row itself and never touches order creation
 * or signature verification; this only ever *reads* from Razorpay and
 * updates the informational fields added for this feature.
 */

export interface PaymentSyncResult {
  razorpayPaymentStatus: string;
  razorpayFee: number | null;
  razorpayTax: number | null;
  netAmount: number | null;
  refundAmount: number | null;
  settlementStatus: SettlementStatus;
  razorpaySettlementId: string | null;
  razorpaySettlementUtr: string | null;
  settledAt: Date | null;
}

/** Paise -> rupees, matching how `Donation.amount` itself is stored. */
function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Razorpay batches many payments into one settlement and does not expose a
 * direct "settlement for this payment" lookup — the only authoritative,
 * per-transaction mapping is the monthly settlement recon report
 * (`settlements.reports`, Razorpay's "Settlement Recon" API). This fetches
 * the report covering the month the payment was captured in and finds the
 * matching entry by payment id. Returns `null` (not `'not_settled'`) if the
 * report doesn't contain the payment at all — that's genuinely ambiguous
 * (could mean "too recent, this month's recon isn't final yet" or a report
 * access issue), never treated as proof of non-settlement.
 */
async function findSettlementReconEntry(
  paymentId: string,
  capturedAtUnix: number,
): Promise<{
  settled: boolean;
  settlementId: string | null;
  settlementUtr: string | null;
  settledAt: Date | null;
} | null> {
  const client = getRazorpayClient();
  const capturedDate = new Date(capturedAtUnix * 1000);
  const year = capturedDate.getUTCFullYear();
  const month = capturedDate.getUTCMonth() + 1;

  try {
    const recon = await (
      client as unknown as {
        settlements: {
          reports: (params: { year: number; month: number; count: number }) => Promise<{
            items?: {
              entity_id?: string;
              type?: string;
              settled?: boolean;
              settlement_id?: string;
              settlement_utr?: string;
              settled_at?: number;
            }[];
          }>;
        };
      }
    ).settlements.reports({ year, month, count: 100 });

    // Confirmed against a real live payment: for `type: "payment"` entries,
    // the transaction's own id is `entity_id` — `payment_id` is null on
    // these and is only populated on `refund`/`transfer` sub-entities that
    // reference their parent payment.
    const entry = (recon.items ?? []).find(
      (i) => i.type === 'payment' && i.entity_id === paymentId,
    );
    if (!entry) return null;

    return {
      settled: !!entry.settled,
      settlementId: entry.settlement_id ?? null,
      settlementUtr: entry.settlement_utr ?? null,
      settledAt: entry.settled_at ? new Date(entry.settled_at * 1000) : null,
    };
  } catch (err) {
    // Settlement Recon access can be unavailable for some account
    // configurations/plans — never let that surface as "not settled".
    logger.warn('Settlement recon report unavailable', {
      paymentId,
      error: err instanceof Error ? err.message : err,
    });
    return null;
  }
}

/**
 * Fetches a payment's live status/fee/refund info from Razorpay, and — only
 * when the payment is actually captured — cross-references the settlement
 * recon report to determine whether it has reached the bank account yet.
 * Read-only against Razorpay; the caller decides whether/how to persist it.
 */
export async function fetchPaymentSyncData(paymentId: string): Promise<PaymentSyncResult> {
  const client = getRazorpayClient();

  let payment;
  try {
    payment = (await client.payments.fetch(paymentId)) as unknown as {
      status: string;
      fee: number | null;
      tax: number | null;
      amount: number;
      amount_refunded: number;
      created_at: number;
    };
  } catch (err) {
    logger.error('Failed to fetch payment from Razorpay for sync', {
      paymentId,
      error: err instanceof Error ? err.message : err,
    });
    throw ApiError.badRequest('Unable to fetch this payment from Razorpay right now.');
  }

  const fee = payment.fee != null ? toRupees(payment.fee) : null;
  const tax = payment.tax != null ? toRupees(payment.tax) : null;
  const netAmount = fee != null && tax != null ? toRupees(payment.amount) - fee - tax : null;
  const refundAmount = payment.amount_refunded > 0 ? toRupees(payment.amount_refunded) : null;

  if (payment.status !== 'captured') {
    // A payment that was never captured (created/authorized/failed) cannot
    // have been settled — this one case is safe to state with certainty
    // without calling the recon report at all.
    return {
      razorpayPaymentStatus: payment.status,
      razorpayFee: fee,
      razorpayTax: tax,
      netAmount,
      refundAmount,
      settlementStatus: 'not_settled',
      razorpaySettlementId: null,
      razorpaySettlementUtr: null,
      settledAt: null,
    };
  }

  const recon = await findSettlementReconEntry(paymentId, payment.created_at);

  let settlementStatus: SettlementStatus;
  if (!recon) {
    settlementStatus = 'unknown';
  } else if (recon.settled) {
    settlementStatus = 'settled';
  } else {
    settlementStatus = 'pending';
  }

  return {
    razorpayPaymentStatus: payment.status,
    razorpayFee: fee,
    razorpayTax: tax,
    netAmount,
    refundAmount,
    settlementStatus,
    razorpaySettlementId: recon?.settlementId ?? null,
    razorpaySettlementUtr: recon?.settlementUtr ?? null,
    settledAt: recon?.settledAt ?? null,
  };
}

/**
 * Full sync for one donation: fetch + persist. Used by the admin "Refresh
 * Payment Status" action and the `settlement.processed` webhook handler.
 * A donation with no `paymentGatewayRef` yet (never reached a payment
 * attempt) is a no-op, not an error — there is nothing to sync.
 */
export async function syncDonationPaymentStatus(donationId: string) {
  const donation = await donationRepo.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found');
  if (!donation.paymentGatewayRef) {
    throw ApiError.badRequest('This donation has no Razorpay payment yet — nothing to refresh.');
  }

  const result = await fetchPaymentSyncData(donation.paymentGatewayRef);
  return donationRepo.updatePaymentSyncData(donationId, result);
}
