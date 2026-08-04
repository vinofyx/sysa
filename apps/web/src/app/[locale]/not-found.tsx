import { FileQuestion } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { StatusPage } from '@/components/shared/status-page';

export default async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations('Errors');
  const tCommon = await getTranslations('Common');

  return (
    <StatusPage
      icon={FileQuestion}
      title={t('notFoundTitle')}
      description={t('notFoundBody')}
      actionLabel={tCommon('goHome')}
      actionHref={`/${locale}`}
    />
  );
}
