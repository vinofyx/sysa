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
  return status === 'failed' || status === 'not_configured' || status === 'skipped';
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
  heldLabel,
  failureReason,
}: {
  label: string;
  status: SmsDeliveryStatus | null | undefined;
  sentLabel: string;
  failedLabel: string;
  processingLabel: string;
  retry: React.ReactNode;
  skipped?: boolean;
  skippedLabel?: string;
  /** Set when a dry run held this channel back: shown neutrally, still resendable. */
  heldLabel?: string;
  failureReason?: string | null;
}) {
  if (heldLabel) {
    return (
      <div className="border-pub-neutral-200 flex flex-col gap-2 border-t py-3 first:border-t-0">
        <div className="flex items-start justify-between gap-3">
          <span className="text-pub-neutral-500">{label}</span>
          <span className="text-pub-neutral-500 text-right text-sm">{heldLabel}</span>
        </div>
        {retry}
      </div>
    );
  }

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
      {isFailed(status) && failureReason && (
        <p className="text-pub-error text-xs">{failureReason}</p>
      )}
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

  const refreshStatus = React.useCallback(() => {
    if (!token) return;
    getDonationStatus(donationId, token)
      .then((fresh) => setStatus(fresh))
      .catch(() => {});
  }, [donationId, token]);

  const emailStatus = status?.emailStatus ?? null;
  const rawWhatsappStatus = status?.whatsappStatus ?? null;
  const whatsappDeliveryStatus = status?.whatsappDeliveryStatus ?? null;

  const emailSkipped = hasEmail === false || status?.emailStatus === 'skipped';
  // WhatsApp is skipped only if the donor did not opt in, or no mobile was provided.
  const whatsappSkipped = status?.mobileOnFile === false || status?.whatsappConsent === false;

  // Delivery report confirmation
  const whatsappDelivered =
    whatsappDeliveryStatus === 'delivered' || whatsappDeliveryStatus === 'read';
  const whatsappDeliveryConfirmedFailed = whatsappDeliveryStatus === 'failed';

  // Effective status: if provider reported delivery failure via webhook, display failed
  const effectiveWhatsappStatus = whatsappDeliveryConfirmedFailed ? 'failed' : rawWhatsappStatus;

  const stillProcessing =
    (!emailSkipped && isProcessing(emailStatus)) ||
    (!whatsappSkipped && isProcessing(effectiveWhatsappStatus));

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

  // Dry run: the backend deliberately sent nothing, so neither "failed" nor a
  // retry button would be honest — show a neutral note instead.
  if (status?.notificationsDryRun) {
    return (
      <div className="border-pub-neutral-200 bg-pub-neutral-white mt-4 rounded-xl border p-5 text-left text-sm">
        <p className="font-medium">{t('receiptDeliveryHeading')}</p>
        <p className="text-pub-neutral-500 mt-1">{t('receiptDeliveryNotSent')}</p>
      </div>
    );
  }

  const emailRetryPermitted =
    !emailSkipped &&
    emailStatus !== 'sent' &&
    !status?.emailFailureReason?.startsWith('[not retried automatically]');

  const whatsappRetryPermitted =
    !whatsappSkipped &&
    effectiveWhatsappStatus !== 'sent' &&
    !status?.whatsappFailureReason?.startsWith('[not retried automatically]');

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
        heldLabel={status?.emailHeldByDryRun ? t('deliveryNotSentYet') : undefined}
        failureReason={status?.emailFailureReason}
        retry={
          emailRetryPermitted ? (
            <RetryDeliveryButton
              donationId={donationId}
              token={token}
              channel="email"
              onStatusChange={refreshStatus}
            />
          ) : null
        }
      />
      <ChannelRow
        label={t('whatsappDeliveryLabel')}
        status={effectiveWhatsappStatus}
        sentLabel={whatsappDelivered ? t('whatsappDelivered') : t('whatsappSubmitted')}
        failedLabel={t('whatsappDeliveryFailed')}
        processingLabel={t('receiptDeliveryProcessing')}
        skipped={whatsappSkipped}
        skippedLabel={
          status?.mobileOnFile === false ? t('mobileNotProvided') : t('whatsappNotRequested')
        }
        heldLabel={status?.whatsappHeldByDryRun ? t('deliveryNotSentYet') : undefined}
        failureReason={status?.whatsappFailureReason}
        retry={
          whatsappRetryPermitted ? (
            <RetryDeliveryButton
              donationId={donationId}
              token={token}
              channel="whatsapp"
              onStatusChange={refreshStatus}
            />
          ) : null
        }
      />
    </div>
  );
}
