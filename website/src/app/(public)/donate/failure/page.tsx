import type { Metadata } from 'next';
import { XCircle } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { Button } from '@/components/ui/button';
import { RetryPaymentButton } from '@/components/public/retry-payment-button';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Donate');
  return buildMetadata({
    locale,
    path: '/donate/failure',
    title: t('paymentFailedTitle'),
    description: t('paymentFailedBody'),
    noIndex: true,
  });
}

export default async function DonationFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ donationId?: string; token?: string }>;
}) {
  const { donationId } = await searchParams;
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('paymentFailedTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
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
    </div>
  );
}
