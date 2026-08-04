import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { EventsBrowser } from '@/components/public/events-browser';
import { getPublicEvents, getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/events',
    title: `${t('events')} — ${settings.siteNameEn}`,
    description: settings.defaultMetaDescription ?? settings.taglineEn ?? settings.siteNameEn,
  });
}

export default async function EventsPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const events = await getPublicEvents();

  return (
    <div>
      <PageHero
        title={t('events')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('events') }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EventsBrowser events={events} locale={locale} />
      </div>
    </div>
  );
}
