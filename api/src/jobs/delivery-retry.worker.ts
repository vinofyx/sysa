import { logger } from '@lib/logger';

import * as donationRepo from '@repositories/donation.repository';
import * as receiptRepo from '@repositories/receipt.repository';
import { RETRY_BACKOFF_MS, issueReceipt } from '@services/receipt.service';

/**
 * Durable receipt-delivery retries, driven by the database instead of an
 * in-memory timer (which a restart or deploy would silently lose).
 *
 * Every run:
 *  1. re-drives receipts whose `next_delivery_retry_at` is due, claimed with
 *     a compare-and-set so several API instances never run the same retry;
 *     issueReceipt only re-attempts channels that are not yet sent and not
 *     permanently rejected, then reschedules with backoff (bounded by
 *     RETRY_BACKOFF_MS.length attempts);
 *  2. issues receipts for recently completed donations that never got a
 *     receipt row (e.g. the DB write failed right after payment).
 *
 * Needs no extra infrastructure: it runs inside the API process.
 */

const POLL_INTERVAL_MS = 60_000;
const BATCH_SIZE = 20;
const MISSING_RECEIPT_LOOKBACK_MS = 7 * 24 * 3_600_000;

export interface DeliveryRetryRunResult {
  retried: number;
  recovered: number;
}

export async function runDeliveryRetriesOnce(
  now: Date = new Date(),
): Promise<DeliveryRetryRunResult> {
  let retried = 0;
  let recovered = 0;

  const due = await receiptRepo.findDueDeliveryRetries(now, RETRY_BACKOFF_MS.length, BATCH_SIZE);
  for (const receipt of due) {
    if (!receipt.nextDeliveryRetryAt) continue;
    const claimed = await receiptRepo.claimDueDeliveryRetry(
      receipt.id,
      receipt.nextDeliveryRetryAt,
    );
    if (!claimed) continue; // another instance took it
    retried += 1;
    logger.info('Durable receipt delivery retry', {
      donationId: receipt.donationId,
      receiptId: receipt.id,
      attempt: receipt.deliveryRetryCount + 1,
    });
    await issueReceipt(receipt.donationId, { retryPending: true });
  }

  const missing = await donationRepo.findCompletedWithoutReceipt(
    new Date(now.getTime() - MISSING_RECEIPT_LOOKBACK_MS),
    BATCH_SIZE,
  );
  for (const donation of missing) {
    recovered += 1;
    logger.warn('Completed donation had no receipt — issuing it now', { donationId: donation.id });
    await issueReceipt(donation.id);
  }

  return { retried, recovered };
}

/** Starts the polling loop; returns a stop function (used on shutdown). */
export function startDeliveryRetryWorker(): () => void {
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap runs within one process
    running = true;
    try {
      await runDeliveryRetriesOnce();
    } catch (error) {
      logger.error('Delivery retry worker run failed', {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
