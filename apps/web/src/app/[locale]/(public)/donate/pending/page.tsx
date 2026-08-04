import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { PendingStatusPoller } from '@/components/public/pending-status-poller';
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

export default async function DonationPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ donationId?: string; token?: string }>;
}) {
  const { donationId, token } = await searchParams;
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('paymentPendingTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <Loader2 className="text-pub-primary-700 mx-auto size-16 animate-spin" />
        <h2 className="font-pub-heading text-pub-primary-900 mt-4 text-xl font-semibold">
          {t('paymentPendingTitle')}
        </h2>
        <p className="text-pub-neutral-500 mt-2">{t('paymentPendingBody')}</p>
      </div>
      {donationId && token && <PendingStatusPoller donationId={donationId} token={token} />}
    </div>
  );
}
