'use client';

import * as React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  retryDonationEmail,
  retryDonationSms,
  retryDonationWhatsApp,
  ApiRequestError,
} from '@/lib/public-api';
import type { SmsDeliveryStatus } from '@/types/public';

/** `smsRetryLimiter` (donation-checkout.routes.ts) replies 429 with plain
 * text, not this API's `{error:{message}}` envelope — same gap already
 * handled for the donation form itself, reused here. */
function getRetryErrorMessage(error: ApiRequestError, tForms: (key: string) => string): string {
  if (error.status === 429) return tForms('errorRateLimited');
  if (error.status === undefined) return tForms('errorNetwork');
  return error.message || tForms('errorTitle');
}

type DeliveryChannel = 'sms' | 'email' | 'whatsapp';

/**
 * Manual re-send for a receipt delivery channel — never touches the donation
 * or payment record, only re-attempts the channel against the already-issued
 * receipt. Shown on the success page whenever the last known status isn't
 * `'sent'`; hidden immediately once a retry succeeds.
 */
export function RetryDeliveryButton({
  donationId,
  token,
  channel,
}: {
  donationId: string;
  token?: string;
  channel: DeliveryChannel;
}) {
  const t = useTranslations('Donate');
  const tForms = useTranslations('Forms');
  const [status, setStatus] = React.useState<SmsDeliveryStatus | null>(null);

  const mutation = useMutation<SmsDeliveryStatus, ApiRequestError, void>({
    mutationFn: async () => {
      if (channel === 'email') {
        const data = await retryDonationEmail(donationId, token);
        return data.emailStatus;
      }
      if (channel === 'whatsapp') {
        const data = await retryDonationWhatsApp(donationId, token);
        return data.whatsappStatus;
      }
      const data = await retryDonationSms(donationId, token);
      return data.smsStatus;
    },
    onSuccess: (nextStatus) => setStatus(nextStatus),
  });

  const sentNote =
    channel === 'email'
      ? t('emailSentSuccessfully')
      : channel === 'whatsapp'
        ? t('whatsappSentSuccessfully')
        : t('smsSentNote');
  const notSentNote =
    channel === 'email'
      ? t('emailDeliveryFailed')
      : channel === 'whatsapp'
        ? t('whatsappDeliveryFailed')
        : t('smsNotSentNote');
  const retryLabel =
    channel === 'email'
      ? t('retryEmail')
      : channel === 'whatsapp'
        ? t('retryWhatsApp')
        : t('retrySms');

  if (status === 'sent') {
    return <p className="text-pub-primary-700 text-sm">{sentNote}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {retryLabel}
      </Button>
      {mutation.isSuccess && <p className="text-pub-error text-sm">{notSentNote}</p>}
      {mutation.isError && (
        <p className="text-pub-error text-sm">{getRetryErrorMessage(mutation.error, tForms)}</p>
      )}
    </div>
  );
}

/** @deprecated Prefer RetryDeliveryButton with channel="sms". */
export function RetrySmsButton({ donationId, token }: { donationId: string; token?: string }) {
  return <RetryDeliveryButton donationId={donationId} token={token} channel="sms" />;
}
