'use client';

import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { getDonationStatus } from '@/lib/public-api';
import { isTerminalPollError } from '@/lib/receipt-access';

const POLL_INTERVAL_MS = 4000;
/** ~3 minutes; after that the page is left showing "still processing" and a
 * reload re-checks, instead of polling indefinitely. */
const MAX_POLLS = 45;

/** Polls `/donations/:id/status` while a payment settles (e.g. net banking,
 * which doesn't always confirm synchronously) and redirects to the
 * success/failure page as soon as Razorpay's webhook resolves it — the
 * fallback-reconciliation path from design/13-API-Architecture.md §5.
 * Stops on an expired/revoked link or a missing donation (retrying cannot
 * help — the page is re-rendered to explain why) and after MAX_POLLS. */
export function PendingStatusPoller({ donationId, token }: { donationId: string; token: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    let polls = 0;
    const query = `donationId=${encodeURIComponent(donationId)}&token=${encodeURIComponent(token)}`;
    const interval = setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) {
        clearInterval(interval);
        return;
      }
      getDonationStatus(donationId, token)
        .then((status) => {
          if (cancelled) return;
          if (status.status === 'completed') {
            clearInterval(interval);
            router.replace(`/donate/success?${query}`);
            router.refresh();
          } else if (status.status === 'failed') {
            clearInterval(interval);
            router.replace(`/donate/failure?${query}`);
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          if (isTerminalPollError(error)) {
            clearInterval(interval);
            router.refresh();
          }
          /* otherwise transient — keep polling */
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [donationId, token, router]);

  return null;
}
