'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { PremiumButton } from '@/components/public/premium-button';

/** Second "Donate Online" option, alongside the existing Razorpay checkout
 * (DonationCheckoutForm) — a direct `upi://pay` deep link plus a manual
 * copy-the-UPI-ID fallback for donors on desktop or without a UPI app that
 * registers the `upi://` scheme. Deliberately has no amount field: UPI apps
 * always let the donor enter their own amount, and prefilling one here would
 * contradict that. Never claims a payment succeeded — this only ever hands
 * off to the donor's own UPI app; only that app/bank can confirm the
 * transfer. */
export function UpiDonationCard({ upiId, payeeName }: { upiId: string; payeeName: string }) {
  const t = useTranslations('Donate');
  const tCommon = useTranslations('Common');
  const [copied, setCopied] = React.useState(false);

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`;

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      toast.success(t('upiIdCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject (denied permission, insecure context) — the
      // UPI ID stays visible on-screen for the donor to copy manually.
    }
  }

  return (
    <div className="border-pub-neutral-200 bg-pub-neutral-white relative flex flex-col gap-4 overflow-hidden rounded-xl border p-6">
      <span className="pub-gradient-gold absolute inset-x-0 top-0 h-1" />
      <h3 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 flex items-center gap-2 text-base font-semibold">
        <Smartphone className="text-pub-primary-700 dark:text-pub-gold-300 size-5" />{' '}
        {t('upiCardTitle')}
      </h3>
      <p className="text-pub-neutral-500 text-xs">{t('upiCardDescription')}</p>

      <div className="border-pub-neutral-200 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0">
          <p className="text-pub-neutral-500 text-xs">{t('upiIdLabel')}</p>
          <p className="text-pub-primary-950 dark:text-pub-neutral-900 truncate font-mono text-sm font-semibold sm:text-base">
            {upiId}
          </p>
        </div>
        <button
          type="button"
          onClick={copyUpiId}
          aria-label={t('copyUpiId')}
          className="border-pub-neutral-200 text-pub-neutral-700 hover:border-pub-primary-700 hover:text-pub-primary-700 dark:hover:border-pub-gold-300 dark:hover:text-pub-gold-300 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? tCommon('copied') : t('copyUpiId')}
        </button>
      </div>

      <PremiumButton render={<a href={upiUri} />} className="w-full justify-center">
        <ShieldCheck /> {t('payViaUpi')}
      </PremiumButton>
    </div>
  );
}
