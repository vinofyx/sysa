import type { Metadata } from 'next';
import { HeartHandshake } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { ActivityCard } from '@/components/public/activity-card';
import { EmptyState } from '@/components/admin/empty-state';
import { getActivities, getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/activities',
    title: `${t('activities')} — ${settings.siteNameEn}`,
    description: settings.defaultMetaDescription ?? settings.taglineEn ?? settings.siteNameEn,
  });
}

export default async function ActivitiesPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const activities = await getActivities();

  return (
    <div>
      <PageHero
        title={t('activities')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('activities') }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {activities.length === 0 ? (
          <EmptyState icon={HeartHandshake} title={tCommon('comingSoon')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
