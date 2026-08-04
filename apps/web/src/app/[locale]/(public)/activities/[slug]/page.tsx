import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { JsonLd } from '@/components/public/json-ld';
import { Button } from '@/components/ui/button';
import { getActivityBySlug, getSiteSettings } from '@/lib/public-api';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { env } from '@/lib/env';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const description =
    activity.descriptionEn?.replace(/<[^>]+>/g, '').slice(0, 160) ?? settings.taglineEn ?? '';

  return buildMetadata({
    locale,
    path: `/activities/${slug}`,
    title: `${title} — ${settings.siteNameEn}`,
    description,
    image: activity.iconOrImageUrl,
  });
}

export default async function ActivityDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const description =
    locale === 'te' && activity.descriptionTe ? activity.descriptionTe : activity.descriptionEn;

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('home'), url: env.NEXT_PUBLIC_SITE_URL },
          { name: t('activities'), url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/activities` },
          { name: title, url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/activities/${slug}` },
        ])}
      />
      <PageHero
        title={title}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('activities'), href: '/activities' },
          { label: title },
        ]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <RichContent html={description ?? ''} />
        {activity.linkedCategory && (
          <div className="border-pub-primary-100 bg-pub-primary-100 mt-8 flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
            <p className="text-pub-primary-900 text-sm font-medium">
              {locale === 'te' && activity.linkedCategory.nameTe
                ? activity.linkedCategory.nameTe
                : activity.linkedCategory.nameEn}
            </p>
            <Button
              render={<Link href={`/donate?category=${activity.linkedCategory.code}`} />}
              className="bg-pub-primary-700 hover:bg-pub-primary-500"
            >
              {tCommon('donateNow')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
