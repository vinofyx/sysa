import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { DonationSuccessView } from '@/components/public/donation-success-view';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Donate');
  return buildMetadata({
    locale,
    path: '/donate/success',
    title: t('paymentSuccessTitle'),
    description: t('paymentSuccessPaymentOnly'),
    noIndex: true,
  });
}

export default async function DonationSuccessPage() {
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  return (
    <div>
      <PageHero
        title={t('paymentSuccessTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="text-pub-primary-700 size-14 animate-spin" />
            </div>
          }
        >
          <DonationSuccessView />
        </Suspense>
      </div>
    </div>
  );
}
