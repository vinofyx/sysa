import type { Metadata } from 'next';
import { FileDown, Clock } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { Button } from '@/components/ui/button';
import { getDonationReceipt } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Donate');
  return buildMetadata({
    locale,
    path: '/donate/receipt',
    title: t('downloadReceipt'),
    description: t('downloadReceipt'),
    noIndex: true,
  });
}

export default async function DonationReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');

  const receipt = await getDonationReceipt(id, token).catch(() => null);

  return (
    <div>
      <PageHero
        title={t('downloadReceipt')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        {receipt ? (
          <>
            <FileDown className="text-pub-primary-700 mx-auto size-16" />
            <h2 className="font-pub-heading text-pub-primary-900 mt-4 text-xl font-semibold">
              {receipt.receiptNumber}
            </h2>
            <div className="mt-6">
              <Button
                className="bg-pub-primary-700 hover:bg-pub-primary-500"
                render={<a href={receipt.pdfUrl} target="_blank" rel="noreferrer" />}
              >
                <FileDown /> {t('downloadReceipt')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Clock className="text-pub-neutral-500 mx-auto size-16" />
            <p className="text-pub-neutral-500 mt-4">{t('receiptNotReady')}</p>
          </>
        )}
        <div className="mt-8">
          <Button variant="outline" render={<Link href="/donate" />}>
            {t('backToDonate')}
          </Button>
        </div>
      </div>
    </div>
  );
}
