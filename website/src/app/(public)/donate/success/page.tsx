import type { Metadata } from 'next';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { Button } from '@/components/ui/button';
import { PendingStatusPoller } from '@/components/public/pending-status-poller';
import { ReceiptDeliveryPanel } from '@/components/public/receipt-delivery-panel';
import { ReceiptAccessMessage } from '@/components/public/receipt-access-message';
import { ReceiptSummary } from '@/components/public/receipt-summary';
import { getDonationStatus } from '@/lib/public-api';
import { loadWithReceiptAccess } from '@/lib/receipt-access';
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

  const result = donationId
    ? await loadWithReceiptAccess(token, (accessToken) =>
        getDonationStatus(donationId, accessToken),
      )
    : null;
  const status = result?.ok ? result.data : null;
  // An expired/revoked link or an outage is shown as such — never as a
  // payment that is still processing (which would also poll forever).
  const accessFailure = result && !result.ok ? result.reason : null;

  // Only a payment the API reports as completed is shown as successful. An
  // unknown status (no token, API unreachable) or a pending one is shown as
  // still being confirmed — never as a success.
  const outcome =
    status?.status === 'completed' ? 'paid' : status?.status === 'failed' ? 'failed' : 'pending';
  const title =
    outcome === 'paid'
      ? t('paymentSuccessTitle')
      : outcome === 'failed'
        ? t('paymentFailedTitle')
        : t('paymentPendingTitle');

  return (
    <div>
      <PageHero
        title={accessFailure === 'link_invalid' ? t('receiptLinkInvalidTitle') : title}
        breadcrumb={[{ label: tNav('home'), href: '/' }, { label: tNav('donate') }]}
      />
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        {accessFailure && donationId ? (
          <ReceiptAccessMessage
            reason={accessFailure}
            retryHref={`/donate/success?donationId=${encodeURIComponent(donationId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`}
          />
        ) : (
          <>
            {outcome === 'paid' ? (
              <CheckCircle2 className="text-pub-primary-700 mx-auto size-16" />
            ) : outcome === 'failed' ? (
              <XCircle className="text-pub-error mx-auto size-16" />
            ) : (
              <Clock className="text-pub-neutral-500 mx-auto size-16" />
            )}
            <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
              {title}
            </h2>
            <p className="text-pub-neutral-500 mt-2">
              {outcome === 'paid'
                ? t('paymentSuccessPaymentOnly')
                : outcome === 'failed'
                  ? t('paymentFailedBody')
                  : t('paymentPendingBody')}
            </p>

            {status && <ReceiptSummary status={status} />}

            {donationId && token && status?.status === 'pending' && (
              <PendingStatusPoller donationId={donationId} token={token} />
            )}

            {donationId && outcome === 'paid' && (
              <ReceiptDeliveryPanel
                donationId={donationId}
                token={token}
                initialStatus={status}
                hasEmail={status?.emailOnFile !== false}
              />
            )}
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {donationId && outcome === 'paid' && status?.receiptAvailable && (
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
