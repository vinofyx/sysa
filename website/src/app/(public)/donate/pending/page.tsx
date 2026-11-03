import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { DonationPendingView } from '@/components/public/donation-pending-view';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Donate');
  return buildMetadata({
    locale,
    path: '/donate/pending',
    title: t('paymentPendingTitle'),
    description: t('paymentPendingBody'),
    noIndex: true,
  });
}

export default async function DonationPendingPage() {
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('paymentPendingTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <Suspense>
        <DonationPendingView />
      </Suspense>
    </div>
  );
}
