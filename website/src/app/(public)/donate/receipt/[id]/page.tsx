import type { Metadata } from 'next';
import { FileDown, Clock, CloudOff } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { ReceiptSummary } from '@/components/public/receipt-summary';
import { Button } from '@/components/ui/button';
import { ReceiptAccessMessage } from '@/components/public/receipt-access-message';
import { donationReceiptPdfUrl, getDonationReceipt } from '@/lib/public-api';
import { loadWithReceiptAccess, type ReceiptAccessFailure } from '@/lib/receipt-access';
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

  // Always settles into one explicit state — an expired link or an outage is
  // never shown as "being prepared".
  const result = isStaticExport
    ? null
    : await loadWithReceiptAccess(token, (accessToken) => getDonationReceipt(id, accessToken));
  const receipt = result?.ok ? result.data : null;
  const failure: ReceiptAccessFailure | null = result
    ? result.ok
      ? result.data.status === 'completed'
        ? null
        : 'not_completed'
      : result.reason
    : null;

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
        ) : failure ? (
          <ReceiptAccessMessage
            reason={failure}
            retryHref={`/donate/receipt/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
          />
        ) : receipt ? (
          <>
            <FileDown className="text-pub-primary-700 mx-auto size-16" />
            <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
              {receipt.receiptNumber}
            </h2>
            <ReceiptSummary status={receipt} />
            <div className="mt-6">
              {receipt.receiptNumber ? (
                <Button
                  className="bg-pub-primary-700 hover:bg-pub-primary-500"
                  render={<a href={donationReceiptPdfUrl(id, token)} download />}
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
