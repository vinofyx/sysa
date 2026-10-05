'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, LogOut, Mail } from 'lucide-react';
import type { AxiosError } from 'axios';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { donorLogout, getMyDonations, requestDonorOtp, verifyDonorOtp } from '@/lib/public-api';
import { formatCurrency } from '@/lib/format';

interface ApiErrorBody {
  error: { code: string; message: string };
}

const STATUS_KEYS = {
  pending: 'statusPending',
  completed: 'statusCompleted',
  failed: 'statusFailed',
  refunded: 'statusRefunded',
} as const;

export function DonationHistoryView() {
  const locale = useLocale();
  const t = useTranslations('Donate');
  const tCommon = useTranslations('Common');
  const tForms = useTranslations('Forms');
  const queryClient = useQueryClient();

  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);

  const donationsQuery = useQuery({
    queryKey: ['my-donations'],
    queryFn: () => getMyDonations(1, 20),
    retry: false,
  });

  const requestOtpMutation = useMutation<void, AxiosError<ApiErrorBody>, void>({
    mutationFn: () => requestDonorOtp(email),
    onSuccess: () => setOtpSent(true),
  });

  const verifyOtpMutation = useMutation<void, AxiosError<ApiErrorBody>, void>({
    mutationFn: () => verifyDonorOtp(email, otp),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-donations'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => donorLogout(),
    onSuccess: () => {
      queryClient.setQueryData(['my-donations'], undefined);
      void queryClient.invalidateQueries({ queryKey: ['my-donations'] });
      setEmail('');
      setOtp('');
      setOtpSent(false);
    },
  });

  const isAuthenticated = !!donationsQuery.data && !donationsQuery.isError;

  if (donationsQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-pub-primary-700 size-8 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-lg font-semibold">
            {t('donationHistory')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
            <LogOut /> {t('logout')}
          </Button>
        </div>
        {donationsQuery.data && donationsQuery.data.data.length === 0 ? (
          <EmptyState icon={Mail} title={t('noDonationsYet')} />
        ) : (
          <div className="flex flex-col gap-3">
            {donationsQuery.data?.data.map((donation) => (
              <div
                key={donation.id}
                className="border-pub-neutral-200 bg-pub-neutral-white flex items-center justify-between rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">
                    {locale === 'te' && donation.category.nameTe
                      ? donation.category.nameTe
                      : donation.category.nameEn}
                  </p>
                  <p className="text-pub-neutral-500 text-xs">
                    {new Date(donation.createdAt).toLocaleDateString(
                      locale === 'te' ? 'te-IN' : 'en-IN',
                    )}{' '}
                    · <span>{t(STATUS_KEYS[donation.status])}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">
                    {formatCurrency(donation.amount, donation.currency)}
                  </p>
                  {donation.receiptAvailable && donation.receiptToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link
                          href={`/donate/receipt/${donation.id}?token=${donation.receiptToken}`}
                        />
                      }
                    >
                      {t('viewReceipt')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-pub-neutral-200 bg-pub-neutral-white mx-auto max-w-sm rounded-xl border p-6">
      <h2 className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 mb-1 text-lg font-semibold">
        {t('donationHistory')}
      </h2>
      <p className="text-pub-neutral-500 mb-4 text-sm">{t('historyIntro')}</p>

      {!otpSent ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOtpMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="email"
            required
            placeholder={tForms('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            disabled={requestOtpMutation.isPending}
            className="bg-pub-primary-700 hover:bg-pub-primary-500"
          >
            {requestOtpMutation.isPending && <Loader2 className="animate-spin" />}
            {t('sendCode')}
          </Button>
          {requestOtpMutation.isSuccess && (
            <p className="text-pub-success text-xs">{t('historyOtpSent')}</p>
          )}
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyOtpMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-pub-success text-xs">{t('historyOtpSent')}</p>
          <Input
            required
            maxLength={6}
            placeholder={t('enterCode')}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button
            type="submit"
            disabled={verifyOtpMutation.isPending}
            className="bg-pub-primary-700 hover:bg-pub-primary-500"
          >
            {verifyOtpMutation.isPending && <Loader2 className="animate-spin" />}
            {t('verifyCode')}
          </Button>
          {verifyOtpMutation.isError && (
            <p className="text-pub-error text-xs">
              {verifyOtpMutation.error.response?.data?.error?.message ?? tCommon('tryAgain')}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
