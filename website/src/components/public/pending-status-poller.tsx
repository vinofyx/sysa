'use client';

import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { getDonationStatus } from '@/lib/public-api';

const POLL_INTERVAL_MS = 4000;

/** Polls `/donations/:id/status` while a payment settles (e.g. net banking,
 * which doesn't always confirm synchronously) and redirects to the
 * success/failure page as soon as Razorpay's webhook resolves it — the
 * fallback-reconciliation path from design/13-API-Architecture.md §5. */
export function PendingStatusPoller({ donationId, token }: { donationId: string; token: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      getDonationStatus(donationId, token)
        .then((status) => {
          if (cancelled) return;
          if (status.status === 'completed') {
            router.replace(`/donate/success?donationId=${donationId}&token=${token}`);
          } else if (status.status === 'failed') {
            router.replace(`/donate/failure?donationId=${donationId}&token=${token}`);
          }
        })
        .catch(() => {
          /* transient error — keep polling */
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [donationId, token, router]);

  return null;
}
