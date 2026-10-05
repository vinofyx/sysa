import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { Button } from '@/components/ui/button';
import { ReceiptDeliveryPanel } from '@/components/public/receipt-delivery-panel';
import { getDonationStatus } from '@/lib/public-api';
import { formatCurrency } from '@/lib/format';
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

export default async function DonationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ donationId?: string; token?: string }>;
}) {
  const { donationId, token } = await searchParams;
  const t = await getTranslations('Donate');
  const tNav = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');

  const status =
    donationId && token ? await getDonationStatus(donationId, token).catch(() => null) : null;

  const paymentSucceeded = !status || status.status === 'completed';

  return (
    <div>
      <PageHero
        title={t('paymentSuccessTitle')}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <CheckCircle2 className="text-pub-primary-700 mx-auto size-16" />
        <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
          {t('paymentSuccessTitle')}
        </h2>
        <p className="text-pub-neutral-500 mt-2">
          {paymentSucceeded ? t('paymentSuccessPaymentOnly') : t('paymentPendingBody')}
        </p>

        {status && (
          <div className="border-pub-neutral-200 bg-pub-neutral-white mt-6 rounded-xl border p-5 text-left text-sm">
            <div className="flex justify-between py-1">
              <span className="text-pub-neutral-500">{t('paymentStatusLabel')}</span>
              <span className="font-medium capitalize">{status.status}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-pub-neutral-500">{t('categoriesHeading')}</span>
              <span className="font-medium">{status.category}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-pub-neutral-500">{t('amount')}</span>
              <span className="font-medium">{formatCurrency(status.amount, status.currency)}</span>
            </div>
            {status.receiptNumber && (
              <div className="flex justify-between py-1">
                <span className="text-pub-neutral-500">{t('receiptNumberLabel')}</span>
                <span className="font-medium">{status.receiptNumber}</span>
              </div>
            )}
            {status.paymentReference && (
              <div className="flex justify-between py-1">
                <span className="text-pub-neutral-500">{t('paymentReferenceLabel')}</span>
                <span className="font-medium break-all">{status.paymentReference}</span>
              </div>
            )}
          </div>
        )}

        {donationId && (
          <ReceiptDeliveryPanel
            donationId={donationId}
            token={token}
            initialStatus={status}
            hasEmail={status?.emailOnFile !== false}
          />
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {donationId && status?.receiptAvailable && (
            <Button
              className="bg-pub-primary-700 hover:bg-pub-primary-500"
              render={
                <Link href={`/donate/receipt/${donationId}${token ? `?token=${token}` : ''}`} />
              }
            >
              {t('viewReceipt')}
            </Button>
          )}
          <Button variant="outline" render={<Link href="/" />}>
            {tCommon('goHome')}
          </Button>
        </div>
      </div>
    </div>
  );
}
