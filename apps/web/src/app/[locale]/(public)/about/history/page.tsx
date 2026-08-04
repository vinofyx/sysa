import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { getPageContent, getSiteSettings } from '@/lib/public-api';
import { parseAboutBlocks } from '@/lib/about-content';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/about/history',
    title: `${t('history')} — ${settings.siteNameEn}`,
    description: settings.defaultMetaDescription ?? settings.taglineEn ?? settings.siteNameEn,
  });
}

export default async function HistoryPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const content = await getPageContent('about');
  const blocks = parseAboutBlocks(content);
  const html = locale === 'te' && blocks.historyTe ? blocks.historyTe : blocks.historyEn;

  return (
    <div>
      <PageHero
        title={t('history')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('history') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <RichContent html={html} />
      </div>
    </div>
  );
}
