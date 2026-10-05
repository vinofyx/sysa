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
    path: '/about/mission',
    title: `Our Mission | ${settings.siteNameEn}`,
    description: `How ${settings.siteNameEn} works to support poor elderly people, students and people facing medical hardship.`,
  });
}

export default async function MissionPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const content = await getPageContent('about');
  const blocks = parseAboutBlocks(content);
  const html = locale === 'te' && blocks.missionTe ? blocks.missionTe : blocks.missionEn;

  return (
    <div>
      <PageHero
        title={t('mission')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('mission') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <RichContent
          html={html}
          className="[&_h2]:border-pub-gold-300/40 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:first:mt-0"
        />
      </div>
    </div>
  );
}
