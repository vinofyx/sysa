import { AlertCircle, Clock, LinkIcon, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import type { ReceiptAccessFailure } from '@/lib/receipt-access';

/**
 * The receipt/status pages' message when a receipt cannot be shown. Each
 * reason gets its own wording and a next step; none of them reveals anything
 * about the donation itself.
 */
export function ReceiptAccessMessage({
  reason,
  retryHref,
}: {
  reason: ReceiptAccessFailure;
  /** Same page again (used for "not ready" and "unavailable"). */
  retryHref: string;
}) {
  const t = useTranslations('Donate');

  if (reason === 'link_invalid') {
    return (
      <div data-testid="receipt-access-message" data-reason={reason}>
        <LinkIcon className="text-pub-neutral-500 mx-auto size-16" />
        <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mt-4 text-xl font-semibold">
          {t('receiptLinkInvalidTitle')}
        </h2>
        <p className="text-pub-neutral-500 mt-2">{t('receiptLinkInvalidBody')}</p>
        <div className="mt-6">
          <Button
            className="bg-pub-primary-700 hover:bg-pub-primary-500"
            render={<Link href="/donate/history" />}
          >
            {t('viewMyDonations')}
          </Button>
        </div>
      </div>
    );
  }

  const Icon =
    reason === 'unavailable' ? WifiOff : reason === 'not_completed' ? AlertCircle : Clock;
  const body =
    reason === 'unavailable'
      ? t('receiptUnavailableBody')
      : reason === 'not_completed'
        ? t('receiptNotCompletedBody')
        : t('receiptNotReady');

  return (
    <div data-testid="receipt-access-message" data-reason={reason}>
      <Icon className="text-pub-neutral-500 mx-auto size-16" />
      <p className="text-pub-neutral-500 mt-4">{body}</p>
      {reason !== 'not_completed' && (
        <div className="mt-6">
          <Button variant="outline" render={<a href={retryHref} />}>
            {t('tryAgain')}
          </Button>
        </div>
      )}
    </div>
  );
}
