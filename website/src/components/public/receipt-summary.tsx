import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { formatReceiptAmount, formatReceiptDateTime } from '@/lib/format';
import type { DonationPaymentStatus, DonationStatusResult } from '@/types/public';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  bank_transfer_manual: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
};

const STATUS_KEYS: Record<DonationPaymentStatus, string> = {
  completed: 'paymentStatusPaid',
  pending: 'paymentStatusPending',
  failed: 'paymentStatusFailed',
  refunded: 'paymentStatusRefunded',
};

/**
 * The on-screen receipt: the same fields, in the same order, as the PDF
 * (api/src/services/receipt-pdf.service.ts). Only what the API returned is
 * shown — a missing optional field is left out, never filled in. Contact
 * details arrive masked because this page is reachable by link.
 */
export function ReceiptSummary({ status }: { status: DonationStatusResult }) {
  const t = useTranslations('Donate');
  const paid = status.status === 'completed';

  const rows: Array<[string, string]> = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) rows.push([label, value]);
  };
  add(t('receiptNumberLabel'), status.receiptNumber);
  add(
    t('donationDateLabel'),
    status.donationDate ? formatReceiptDateTime(status.donationDate) : null,
  );
  add(t('donorNameLabel'), status.donorName);
  add(t('donorMobileLabel'), status.donorPhoneMasked);
  add(t('donorEmailLabel'), status.donorEmailMasked);
  add(t('donorAddressLabel'), status.donorAddress);
  add(t('donorCityLabel'), status.donorCity);
  add(t('donorStateLabel'), status.donorState);
  add(t('donorPincodeLabel'), status.donorPincode);
  add(t('donorPanLabel'), status.panNumberMasked);
  add(t('donationCategoryLabel'), status.category);
  add(t('amount'), formatReceiptAmount(status.amount, status.currency));
  add(t('paymentStatusLabel'), t(STATUS_KEYS[status.status] ?? 'paymentStatusPending'));
  add(
    t('paymentMethodLabel'),
    status.paymentMethod
      ? (PAYMENT_METHOD_LABELS[status.paymentMethod] ?? status.paymentMethod.replace(/_/g, ' '))
      : null,
  );
  add(t('razorpayPaymentIdLabel'), status.paymentReference);

  return (
    <div
      className="border-pub-neutral-200 bg-pub-neutral-white mt-6 rounded-xl border p-5 text-left text-sm"
      data-testid="receipt-summary"
    >
      <div className="border-pub-neutral-200 flex items-center gap-3 border-b pb-4">
        <Image src="/logo.png" alt="" width={44} height={44} className="shrink-0 rounded-full" />
        <div className="min-w-0">
          <p className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 font-semibold">
            {status.organisationName ?? 'Sai Yadadri Seva Ashram'}
          </p>
          <p className="text-pub-neutral-500 text-xs tracking-wide uppercase">
            {t('receiptDetailsHeading')}
          </p>
        </div>
      </div>
      {paid && <p className="text-pub-neutral-500 mt-4 leading-relaxed">{t('receiptThankYou')}</p>}
      <dl className="mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-1">
            <dt className="text-pub-neutral-500 shrink-0">{label}</dt>
            <dd className="text-right font-medium [overflow-wrap:anywhere] break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
