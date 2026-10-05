import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { getPageContent, getSiteSettings } from '@/lib/public-api';
import { parseAboutBlocks } from '@/lib/about-content';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/about/treasurer',
    title: `Treasurer's Message | ${settings.siteNameEn}`,
    description: `A message from the Treasurer of ${settings.siteNameEn} on responsible stewardship of donor contributions.`,
  });
}

export default async function TreasurerPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tAbout = await getTranslations('About');
  const content = await getPageContent('about');
  const blocks = parseAboutBlocks(content);
  const html =
    locale === 'te' && blocks.treasurerMessageTe
      ? blocks.treasurerMessageTe
      : blocks.treasurerMessageEn;

  return (
    <div>
      <PageHero
        title={t('treasurer')}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('about'), href: '/about' },
          { label: t('treasurer') },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {html.trim() ? (
          <RichContent
            html={html}
            className="[&_h2]:border-pub-gold-300/40 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:first:mt-0"
          />
        ) : (
          <div className="pub-glass shadow-pub-sm rounded-[var(--radius-pub-card)] px-6 py-14 text-center">
            <Wallet className="text-pub-gold-500 mx-auto size-8" strokeWidth={1.5} />
            <p className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mt-4 text-lg font-semibold">
              {tAbout('treasurerComingSoonTitle')}
            </p>
            <p className="text-pub-neutral-500 mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              {tAbout('treasurerComingSoonBody')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
