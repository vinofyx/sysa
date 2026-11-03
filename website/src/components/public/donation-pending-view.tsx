'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { PendingStatusPoller } from '@/components/public/pending-status-poller';

export function DonationPendingView() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get('donationId') || searchParams.get('id');
  const token = searchParams.get('token');

  const t = useTranslations('Donate');

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <Loader2 className="text-pub-primary-700 mx-auto size-16 animate-spin" />
      <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
        {t('paymentPendingTitle')}
      </h2>
      <p className="text-pub-neutral-500 mt-2">{t('paymentPendingBody')}</p>
      {donationId && token && <PendingStatusPoller donationId={donationId} token={token} />}
    </div>
  );
}
