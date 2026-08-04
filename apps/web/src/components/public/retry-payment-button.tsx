'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { AxiosError } from 'axios';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useRazorpayScript } from '@/hooks/use-razorpay-script';
import { retryDonationPayment, verifyDonationPayment } from '@/lib/public-api';
import '@/types/razorpay';

interface ApiErrorBody {
  error: { code: string; message: string };
}

export function RetryPaymentButton({ donationId }: { donationId: string }) {
  const t = useTranslations('Donate');
  const router = useRouter();
  const razorpayReady = useRazorpayScript();

  const mutation = useMutation<void, AxiosError<ApiErrorBody>, void>({
    mutationFn: async () => {
      const session = await retryDonationPayment(donationId);
      if (!window.Razorpay) {
        throw new Error('Payment gateway is still loading. Please try again in a moment.');
      }

      const razorpay = new window.Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: 'Sai Yadadri Seva Ashram',
        order_id: session.razorpayOrderId,
        theme: { color: '#1B6B3F' },
        handler: (response) => {
          verifyDonationPayment({
            donationId: session.donationId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              router.push(
                `/donate/success?donationId=${session.donationId}&token=${session.statusToken}`,
              );
            })
            .catch(() => {
              router.push(
                `/donate/failure?donationId=${session.donationId}&token=${session.statusToken}`,
              );
            });
        },
      });
      razorpay.open();
    },
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        className="bg-pub-primary-700 hover:bg-pub-primary-500"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !razorpayReady}
      >
        {mutation.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {t('retryPayment')}
      </Button>
      {mutation.isError && (
        <p className="text-pub-error text-sm">
          {mutation.error.response?.data?.error?.message ?? 'Something went wrong'}
        </p>
      )}
    </div>
  );
}
