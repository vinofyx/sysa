import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { DonationFailureView } from '@/components/public/donation-failure-view';
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

export default async function DonationFailurePage() {
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('paymentFailedTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <Suspense>
        <DonationFailureView />
      </Suspense>
    </div>
  );
}
