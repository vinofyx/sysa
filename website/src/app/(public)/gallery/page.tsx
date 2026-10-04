import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { GalleryBrowser } from '@/components/public/gallery-browser';
import { getGalleryAlbums, getSiteSettings } from '@/lib/public-api';
import { buildMetadata, localizedDefaultDescription } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/gallery',
    title: `${t('gallery')} — ${settings.siteNameEn}`,
    description: localizedDefaultDescription(settings, locale),
  });
}

export default async function GalleryPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const albums = await getGalleryAlbums();

  return (
    <div>
      <PageHero
        title={t('gallery')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('gallery') }]}
      />
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <GalleryBrowser albums={albums} locale={locale} />
      </div>
    </div>
  );
}
