'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, FileDown, Loader2, XCircle } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ReceiptDeliveryPanel } from '@/components/public/receipt-delivery-panel';
import { ReceiptAccessMessage } from '@/components/public/receipt-access-message';
import { ReceiptSummary } from '@/components/public/receipt-summary';
import { RetryPaymentButton } from '@/components/public/retry-payment-button';
import { donationReceiptPdfUrl, getDonationStatus } from '@/lib/public-api';
import {
  classifyReceiptError,
  isTerminalPollError,
  type ReceiptAccessFailure,
} from '@/lib/receipt-access';
import type { DonationStatusResult } from '@/types/public';

const POLL_INTERVAL_MS = 3500;
const MAX_POLLS = 45;
const MAX_INITIAL_RETRIES = 2;

export function DonationSuccessView() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get('donationId') || searchParams.get('id');
  const token = searchParams.get('token');

  const t = useTranslations('Donate');
  const tCommon = useTranslations('Common');

  const [status, setStatus] = React.useState<DonationStatusResult | null>(null);
  const [accessFailure, setAccessFailure] = React.useState<ReceiptAccessFailure | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(donationId && token));

  React.useEffect(() => {
    if (!donationId || !token) {
      setAccessFailure('link_invalid');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let pollTimer: NodeJS.Timeout | null = null;
    let pollCount = 0;

    const fetchStatus = async () => {
      try {
        const data = await getDonationStatus(donationId, token);
        if (cancelled) return;
        setStatus(data);
        setAccessFailure(null);
        setLoading(false);

        if (data.status === 'pending' && pollCount < MAX_POLLS) {
          pollCount += 1;
          pollTimer = setTimeout(fetchStatus, POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        const reason = classifyReceiptError(error);
        const rawErrorMsg = error instanceof Error ? error.message : 'Unknown error';
        const safeErrorMessage = rawErrorMsg.replace(/([?&]token=)[^&#\s]+/gi, '$1[REDACTED]');
        console.error('[DonationSuccessView] Failed to fetch donation status', {
          donationId,
          error: safeErrorMessage,
        });

        if (isTerminalPollError(error)) {
          setAccessFailure(reason);
          setLoading(false);
        } else if (!status) {
          // Prevent indefinite spinner on initial load failures: bound retries before displaying error state
          if (pollCount < MAX_INITIAL_RETRIES) {
            pollCount += 1;
            pollTimer = setTimeout(fetchStatus, 1500);
          } else {
            setAccessFailure(reason);
            setLoading(false);
          }
        } else {
          // Status was already loaded; continue background polling up to MAX_POLLS
          if (pollCount < MAX_POLLS) {
            pollCount += 1;
            pollTimer = setTimeout(fetchStatus, POLL_INTERVAL_MS);
          }
        }
      }
    };

    void fetchStatus();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [donationId, token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="text-pub-primary-700 size-14 animate-spin" />
        <p className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-lg font-medium">
          {tCommon('loading')}
        </p>
      </div>
    );
  }

  if (accessFailure && donationId) {
    return (
      <ReceiptAccessMessage
        reason={accessFailure}
        retryHref={`/donate/success?donationId=${encodeURIComponent(donationId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`}
      />
    );
  }

  if (!donationId || !token) {
    return <ReceiptAccessMessage reason="link_invalid" retryHref="/donate" />;
  }

  const outcome =
    status?.status === 'completed' ? 'paid' : status?.status === 'failed' ? 'failed' : 'pending';

  const title =
    outcome === 'paid'
      ? t('paymentSuccessTitle')
      : outcome === 'failed'
        ? t('paymentFailedTitle')
        : t('paymentPendingTitle');

  const body =
    outcome === 'paid'
      ? t('paymentSuccessPaymentOnly')
      : outcome === 'failed'
        ? t('paymentFailedBody')
        : t('paymentPendingBody');

  return (
    <>
      {outcome === 'paid' ? (
        <CheckCircle2 className="text-pub-primary-700 mx-auto size-16" />
      ) : outcome === 'failed' ? (
        <XCircle className="text-pub-error mx-auto size-16" />
      ) : (
        <Clock className="text-pub-neutral-500 mx-auto size-16 animate-pulse" />
      )}
      <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
        {title}
      </h2>
      <p className="text-pub-neutral-500 mt-2">{body}</p>

      {status && <ReceiptSummary status={status} />}

      {donationId && outcome === 'paid' && status && (
        <ReceiptDeliveryPanel
          donationId={donationId}
          token={token}
          initialStatus={status}
          hasEmail={status.emailOnFile !== false}
        />
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {donationId && outcome === 'paid' && status?.receiptAvailable && (
          <Button
            className="bg-pub-primary-700 hover:bg-pub-primary-500"
            render={
              <a href={donationReceiptPdfUrl(donationId, token)} download>
                <FileDown className="mr-2 size-4" /> {t('downloadReceipt')}
              </a>
            }
          >
            <FileDown className="mr-2 size-4" /> {t('downloadReceipt')}
          </Button>
        )}
        {outcome === 'failed' && donationId && <RetryPaymentButton donationId={donationId} />}
        <Button variant="outline" render={<Link href="/" />}>
          {tCommon('goHome')}
        </Button>
      </div>
    </>
  );
}
