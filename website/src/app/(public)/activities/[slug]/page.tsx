import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { ActivityCard } from '@/components/public/activity-card';
import { PremiumButton } from '@/components/public/premium-button';
import { Reveal } from '@/components/public/motion';
import { JsonLd } from '@/components/public/json-ld';
import { Button } from '@/components/ui/button';
import { getActivities, getActivityBySlug, getSiteSettings } from '@/lib/public-api';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { stripHtml } from '@/lib/strip-html';
import { env } from '@/lib/env';
import { activities } from '@/content/activities';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Verified standalone numbers only (docs/PROJECT_CONTEXT.md §4) — omitted
 * entirely for activities with no genuinely verified standalone figure,
 * rather than inventing one. Not derived from `descriptionEn` (which now
 * folds these same numbers into prose) to keep the pill row's data source
 * explicit and easy to audit. */
const ACTIVITY_HIGHLIGHTS: Record<string, { value: string; label: string }[]> = {
  vanaprasthasramam: [{ value: '40', label: 'Residents' }],
  goshala: [
    { value: '10', label: 'Cows' },
    { value: '10', label: 'Calves' },
    { value: '2 Acres', label: 'Fodder Land' },
  ],
};

// Required by `output: 'export'`. Any slug outside this list simply won't
// exist in the static output (fine: nothing in the site links to an unknown
// activity slug either).
export function generateStaticParams() {
  return activities.map((activity) => ({ slug: activity.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const activity = await getActivityBySlug(slug);
  if (!activity) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const descriptionSource =
    locale === 'te' && activity.descriptionTe ? activity.descriptionTe : activity.descriptionEn;
  const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;
  const description =
    (descriptionSource ? stripHtml(descriptionSource) : undefined)?.slice(0, 160) ?? tagline ?? '';

  return buildMetadata({
    locale,
    path: `/activities/${slug}`,
    title: `${title} | ${settings.siteNameEn}`,
    description,
    image: activity.iconOrImageUrl,
  });
}

export default async function ActivityDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const [activity, allActivities] = await Promise.all([getActivityBySlug(slug), getActivities()]);
  if (!activity) notFound();

  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const tActivities = await getTranslations('Activities');
  const title = locale === 'te' && activity.titleTe ? activity.titleTe : activity.titleEn;
  const description =
    locale === 'te' && activity.descriptionTe ? activity.descriptionTe : activity.descriptionEn;
  const highlights = ACTIVITY_HIGHLIGHTS[activity.slug];
  const relatedActivities = allActivities.filter((a) => a.slug !== activity.slug).slice(0, 3);

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('home'), url: env.NEXT_PUBLIC_SITE_URL },
          { name: t('activities'), url: `${env.NEXT_PUBLIC_SITE_URL}/activities` },
          { name: title, url: `${env.NEXT_PUBLIC_SITE_URL}/activities/${slug}` },
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

      <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {activity.iconOrImageUrl && (
          <Reveal className="mb-10">
            <figure className="shadow-pub-md relative aspect-[16/9] overflow-hidden rounded-[var(--radius-pub-lg)]">
              <Image
                src={activity.iconOrImageUrl}
                alt={title}
                fill
                priority
                sizes="(min-width: 1024px) 1100px, 100vw"
                className="object-cover"
              />
            </figure>
          </Reveal>
        )}

        {highlights && highlights.length > 0 && (
          <Reveal className="mb-10 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="pub-glass shadow-pub-sm rounded-[var(--radius-pub-pill)] px-5 py-2.5 text-center"
              >
                <span className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-lg font-bold">
                  {item.value}
                </span>{' '}
                <span className="text-pub-neutral-500 text-xs tracking-wide uppercase">
                  {item.label}
                </span>
              </div>
            ))}
          </Reveal>
        )}

        <Reveal className="mx-auto max-w-3xl">
          <RichContent html={description ?? ''} />
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-3xl">
          {activity.linkedCategory ? (
            <div className="border-pub-primary-100 bg-pub-primary-100 dark:border-pub-primary-900/40 dark:bg-pub-primary-900/30 flex flex-col items-center gap-3 rounded-[var(--radius-pub-card)] border p-8 text-center">
              <p className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-lg font-semibold">
                {locale === 'te' && activity.linkedCategory.nameTe
                  ? activity.linkedCategory.nameTe
                  : activity.linkedCategory.nameEn}
              </p>
              <p className="text-pub-neutral-500 max-w-sm text-sm leading-relaxed">
                {tActivities('supportSevaBody')}
              </p>
              <Button
                render={
                  <Link href={`/donate?category=${activity.linkedCategory.code}#online-donation`} />
                }
                className="bg-pub-primary-700 hover:bg-pub-primary-500 mt-1"
              >
                {tCommon('donateNow')}
              </Button>
            </div>
          ) : (
            <div className="pub-gradient-emerald flex flex-col items-center gap-3 rounded-[var(--radius-pub-card)] p-8 text-center text-white">
              <p className="font-pub-heading text-lg font-semibold">
                {tActivities('supportSevaHeading')}
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-white/80">
                {tActivities('supportSevaBody')}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <PremiumButton render={<Link href="/donate#online-donation" />}>
                  {tCommon('donateNow')}
                </PremiumButton>
                <PremiumButton render={<Link href="/volunteer" />} tone="ghost-light">
                  {tCommon('register')}
                </PremiumButton>
              </div>
            </div>
          )}
        </Reveal>

        {relatedActivities.length > 0 && (
          <div className="mt-20">
            <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mb-8 text-2xl font-semibold">
              {tActivities('relatedHeading')}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {relatedActivities.map((related, index) => (
                <ActivityCard key={related.id} activity={related} locale={locale} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
