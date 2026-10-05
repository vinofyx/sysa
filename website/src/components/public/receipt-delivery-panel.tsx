'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RetryDeliveryButton } from '@/components/public/retry-sms-button';
import { getDonationStatus } from '@/lib/public-api';
import type { DonationStatusResult, SmsDeliveryStatus } from '@/types/public';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 8;

function isProcessing(status: SmsDeliveryStatus | null | undefined): boolean {
  return status === 'pending' || status == null;
}

function isSent(status: SmsDeliveryStatus | null | undefined): boolean {
  return status === 'sent';
}

function isFailed(status: SmsDeliveryStatus | null | undefined): boolean {
  return status === 'failed' || status === 'not_configured';
}

function ChannelRow({
  label,
  status,
  sentLabel,
  failedLabel,
  processingLabel,
  retry,
  skipped,
  skippedLabel,
}: {
  label: string;
  status: SmsDeliveryStatus | null | undefined;
  sentLabel: string;
  failedLabel: string;
  processingLabel: string;
  retry: React.ReactNode;
  skipped?: boolean;
  skippedLabel?: string;
}) {
  if (skipped) {
    return (
      <div className="border-pub-neutral-200 flex flex-col gap-2 border-t py-3 first:border-t-0">
        <div className="flex items-start justify-between gap-3">
          <span className="text-pub-neutral-500">{label}</span>
          <span className="text-pub-neutral-500 text-right text-sm">{skippedLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-pub-neutral-200 flex flex-col gap-2 border-t py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <span className="text-pub-neutral-500">{label}</span>
        <span className="flex items-center gap-2 text-right text-sm font-medium">
          {isSent(status) && (
            <>
              <CheckCircle2 className="text-pub-primary-700 size-4 shrink-0" />
              {sentLabel}
            </>
          )}
          {isFailed(status) && (
            <>
              <XCircle className="text-pub-error size-4 shrink-0" />
              {failedLabel}
            </>
          )}
          {isProcessing(status) && (
            <>
              <Loader2 className="text-pub-primary-700 size-4 shrink-0 animate-spin" />
              {processingLabel}
            </>
          )}
        </span>
      </div>
      {isFailed(status) && retry}
    </div>
  );
}

export function ReceiptDeliveryPanel({
  donationId,
  token,
  initialStatus,
  hasEmail,
}: {
  donationId: string;
  token?: string;
  initialStatus: DonationStatusResult | null;
  hasEmail?: boolean;
}) {
  const t = useTranslations('Donate');
  const [status, setStatus] = React.useState<DonationStatusResult | null>(initialStatus);

  const emailStatus = status?.emailStatus ?? null;
  const whatsappStatus = status?.whatsappStatus ?? null;
  const emailSkipped = hasEmail === false;
  const whatsappSkipped = status?.mobileOnFile === false;
  const stillProcessing =
    (!emailSkipped && isProcessing(emailStatus)) ||
    (!whatsappSkipped && isProcessing(whatsappStatus));

  React.useEffect(() => {
    if (!token || !stillProcessing) return;

    let cancelled = false;
    let polls = 0;
    const interval = setInterval(() => {
      polls += 1;
      getDonationStatus(donationId, token)
        .then((next) => {
          if (!cancelled) setStatus(next);
        })
        .catch(() => {
          /* keep showing last known status */
        });
      if (polls >= MAX_POLLS) clearInterval(interval);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [donationId, token, stillProcessing]);

  return (
    <div className="border-pub-neutral-200 bg-pub-neutral-white mt-4 rounded-xl border p-5 text-left text-sm">
      <p className="font-medium">{t('receiptDeliveryHeading')}</p>
      {stillProcessing && (
        <p className="text-pub-neutral-500 mt-1">{t('receiptDeliveryProcessing')}</p>
      )}
      <ChannelRow
        label={t('emailDeliveryLabel')}
        status={emailStatus}
        sentLabel={t('emailSentSuccessfully')}
        failedLabel={t('emailDeliveryFailed')}
        processingLabel={t('receiptDeliveryProcessing')}
        skipped={emailSkipped}
        skippedLabel={t('emailNotProvided')}
        retry={<RetryDeliveryButton donationId={donationId} token={token} channel="email" />}
      />
      <ChannelRow
        label={t('whatsappDeliveryLabel')}
        status={whatsappStatus}
        sentLabel={t('whatsappSentSuccessfully')}
        failedLabel={t('whatsappDeliveryFailed')}
        processingLabel={t('receiptDeliveryProcessing')}
        skipped={whatsappSkipped}
        skippedLabel={t('mobileNotProvided')}
        retry={<RetryDeliveryButton donationId={donationId} token={token} channel="whatsapp" />}
      />
    </div>
  );
}
