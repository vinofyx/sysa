import type { Metadata } from 'next';
import { FileDown, Clock, CloudOff } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { Button } from '@/components/ui/button';
import { getDonationReceipt } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';
import { isStaticExport } from '@/lib/static-mode';

// Receipt IDs are per-donation database records — standalone/VPS mode
// renders any id on demand (the defaults below), which is exactly right
// there. The Hostinger static export needs different literals here
// (Next.js's route-segment config must be a literal, not an expression —
// see scripts/build-static.mjs, which swaps this exact block for the
// duration of the static build only, then restores it): one inert
// placeholder id (`output: 'export'` rejects an empty generateStaticParams
// list outright) and `dynamicParams = false` so any other id 404s instead of
// attempting an on-demand render with no server to run it on. The page body
// below never calls the live receipt API in static mode regardless — see
// `isStaticExport` further down — it just renders a static "unavailable" notice.
export function generateStaticParams() {
  return [];
}
export const dynamicParams = true;

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

  const receipt = isStaticExport ? null : await getDonationReceipt(id, token).catch(() => null);

  return (
    <div>
      <PageHero
        title={t('downloadReceipt')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        {isStaticExport ? (
          <>
            <CloudOff className="text-pub-neutral-500 mx-auto size-16" />
            <p className="text-pub-neutral-500 mt-4">{t('receiptUnavailableStatic')}</p>
          </>
        ) : receipt ? (
          <>
            <FileDown className="text-pub-primary-700 mx-auto size-16" />
            <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
              {receipt.receiptNumber}
            </h2>
            <div className="mt-6">
              {receipt.pdfUrl || receipt.receiptUrl ? (
                <Button
                  className="bg-pub-primary-700 hover:bg-pub-primary-500"
                  render={
                    <a
                      href={receipt.pdfUrl ?? receipt.receiptUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <FileDown /> {t('downloadReceipt')}
                </Button>
              ) : (
                <p className="text-pub-neutral-500">{t('receiptNotReady')}</p>
              )}
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
