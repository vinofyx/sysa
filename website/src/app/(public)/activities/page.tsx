import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { SectionHeading } from '@/components/public/section-heading';
import { ActivityCard } from '@/components/public/activity-card';
import { PremiumButton } from '@/components/public/premium-button';
import { Reveal } from '@/components/public/motion';
import { EmptyState } from '@/components/shared/empty-state';
import { getActivities, getSiteSettings } from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';
import { stripHtml } from '@/lib/strip-html';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  return buildMetadata({
    locale,
    path: '/activities',
    title: `Our Activities | ${settings.siteNameEn}`,
    description: `Explore the activities of ${settings.siteNameEn} including elderly care, Annaprasadam, Goseva, education support, medical assistance, daily sevas and wellness facilities.`,
  });
}

export default async function ActivitiesPage() {
  const locale = await getLocale();
  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const tActivities = await getTranslations('Activities');
  const activities = await getActivities();

  return (
    <div>
      <PageHero
        title={t('activities')}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: t('activities') }]}
      />
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:items-stretch lg:gap-14">
          <div>
            <SectionHeading
              align="left"
              eyebrow={tActivities('introEyebrow')}
              title={tActivities('introHeading')}
              subtitle={tActivities('introDescription')}
            />
            <Reveal className="max-w-xl">
              <p className="text-pub-neutral-500 mt-4 text-base leading-relaxed sm:text-lg">
                {tActivities('introSupportingText')}
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <PremiumButton render={<a href="#activities-grid" />}>
                  {tActivities('introPrimaryCta')}
                </PremiumButton>
                <PremiumButton render={<Link href="/donate#online-donation" />} tone="emerald">
                  {tActivities('introSecondaryCta')}
                </PremiumButton>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <figure className="shadow-pub-md relative aspect-[4/3] overflow-hidden rounded-[var(--radius-pub-lg)] lg:aspect-auto lg:h-full lg:min-h-[360px]">
              <Image
                src="/images/illustrations/our-seva.jpg"
                alt="Our Seva at Sai Yadadri Seva Ashram: serving meals to elders, medical check-ups, teaching children, scripture reading, and caring for cows"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </figure>
          </Reveal>
        </div>
        <div
          id="activities-grid"
          className="scroll-mt-16 sm:scroll-mt-[70px] lg:scroll-mt-[76px]"
        />
        {activities.length === 0 ? (
          <EmptyState icon={HeartHandshake} title={tCommon('comingSoon')} />
        ) : (
          <>
            {(() => {
              const [featured] = activities;
              const title =
                locale === 'te' && featured.titleTe ? featured.titleTe : featured.titleEn;
              const description =
                locale === 'te' && featured.descriptionTe
                  ? featured.descriptionTe
                  : featured.descriptionEn;
              return (
                <Reveal className="mb-8">
                  <Link
                    href={`/activities/${featured.slug}`}
                    className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-xl bg-pub-neutral-white group grid grid-cols-1 overflow-hidden rounded-[var(--radius-pub-card)] border transition-all duration-500 hover:-translate-y-1 lg:grid-cols-2"
                  >
                    <div className="bg-pub-primary-100 dark:bg-pub-primary-900/30 relative aspect-[4/3] overflow-hidden lg:aspect-auto">
                      {featured.iconOrImageUrl && (
                        <Image
                          src={featured.iconOrImageUrl}
                          alt={title}
                          fill
                          priority
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      )}
                      <span className="pub-gradient-gold text-pub-primary-950 shadow-pub-sm absolute top-5 left-5 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wide uppercase">
                        01
                      </span>
                    </div>
                    <div className="flex flex-col justify-center gap-3 p-8 sm:p-10">
                      <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-2xl font-semibold sm:text-3xl">
                        {title}
                      </h2>
                      {description && (
                        <p className="text-pub-neutral-500 line-clamp-4 text-base leading-relaxed">
                          {stripHtml(description)}
                        </p>
                      )}
                      <span className="text-pub-gold-700 group-hover:text-pub-gold-500 mt-2 inline-flex items-center gap-1 text-sm font-semibold transition-colors">
                        {tCommon('readMore')}
                        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })()}
            <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {activities.slice(1).map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  locale={locale}
                  index={index + 1}
                />
              ))}
            </div>
          </>
        )}

        <Reveal
          variant="scale"
          className="pub-gradient-emerald relative mt-20 overflow-hidden rounded-[var(--radius-pub-lg)] px-6 py-16 text-center text-white sm:px-10 sm:py-20"
        >
          <p className="text-pub-gold-300 mb-3 flex items-center justify-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
            <span className="pub-gradient-gold h-px w-6" />
            {tActivities('closingEyebrow')}
          </p>
          <h2 className="font-pub-heading text-2xl font-semibold sm:text-4xl">
            {tActivities('closingHeading')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {tActivities('closingDescription')}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            {tActivities('closingSupportingText')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <PremiumButton render={<Link href="/donate#online-donation" />}>
              {tActivities('closingPrimaryCta')}
            </PremiumButton>
            <PremiumButton render={<Link href="/volunteer" />} tone="ghost-light">
              {tCommon('register')}
            </PremiumButton>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
