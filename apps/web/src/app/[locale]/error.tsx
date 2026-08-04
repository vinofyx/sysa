'use client';

import { AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { StatusPage } from '@/components/shared/status-page';

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('Errors');
  const tCommon = useTranslations('Common');

  return (
    <StatusPage
      icon={AlertTriangle}
      title={t('serverErrorTitle')}
      description={t('serverErrorBody')}
      onRetry={reset}
      actionLabel={tCommon('goHome')}
      actionHref={`/${locale}`}
    />
  );
}
