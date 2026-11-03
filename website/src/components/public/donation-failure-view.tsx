'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { RetryPaymentButton } from '@/components/public/retry-payment-button';

export function DonationFailureView() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get('donationId');

  const t = useTranslations('Donate');

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <XCircle className="text-pub-error mx-auto size-16" />
      <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
        {t('paymentFailedTitle')}
      </h2>
      <p className="text-pub-neutral-500 mt-2">{t('paymentFailedBody')}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {donationId && <RetryPaymentButton donationId={donationId} />}
        <Button variant="outline" render={<Link href="/donate" />}>
          {t('backToDonate')}
        </Button>
      </div>
    </div>
  );
}
