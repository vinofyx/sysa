import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { NewsBrowser } from '@/components/public/news-browser';
import { getPublicNewsPosts, getSiteSettings } from '@/lib/public-api';
import { buildMetadata, localizedDefaultDescription } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/news',
    title: `${t('news')} — ${settings.siteNameEn}`,
    description: localizedDefaultDescription(settings, locale),
  });
}

export default async function NewsPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const posts = await getPublicNewsPosts();

  return (
    <div>
      <PageHero
        title={t('news')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('news') }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <NewsBrowser posts={posts} locale={locale} />
      </div>
    </div>
  );
}
