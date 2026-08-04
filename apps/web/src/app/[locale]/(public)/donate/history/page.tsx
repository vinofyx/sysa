import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { DonationHistoryView } from '@/components/public/donation-history-view';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Donate');
  return buildMetadata({
    locale,
    path: '/donate/history',
    title: t('donationHistory'),
    description: t('historyIntro'),
    noIndex: true,
  });
}

export default async function DonationHistoryPage() {
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('donationHistory')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <DonationHistoryView />
      </div>
    </div>
  );
}
