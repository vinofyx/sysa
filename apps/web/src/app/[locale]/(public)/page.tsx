import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/public/json-ld';
import { HeroBannerSection } from '@/components/public/hero-banner';
import { SectionHeading } from '@/components/public/section-heading';
import { StatCard } from '@/components/public/stat-card';
import { ActivityCard } from '@/components/public/activity-card';
import { EventCard } from '@/components/public/event-card';
import { NewsCard } from '@/components/public/news-card';
import { TestimonialCarousel } from '@/components/public/testimonial-carousel';
import { ProgressBar } from '@/components/public/progress-bar';
import { GalleryGrid } from '@/components/public/gallery-lightbox';
import { NewsletterForm } from '@/components/public/newsletter-form';
import {
  getActivities,
  getAppeals,
  getGalleryAlbums,
  getHeroBanners,
  getPageContent,
  getPublicEvents,
  getPublicNewsPosts,
  getSiteSettings,
  getTestimonials,
} from '@/lib/public-api';
import { buildMetadata, defaultSeoFields, ngoJsonLd } from '@/lib/seo';
import { sanitizeRichText } from '@/lib/sanitize';
import { env } from '@/lib/env';

interface ImpactStat {
  valueEn: string;
  labelEn: string;
}

interface HomeBlocks {
  welcomeMessageEn: string;
  impactStats: ImpactStat[];
}

function parseHomeBlocks(blocksEn: Record<string, unknown>): HomeBlocks {
  return {
    welcomeMessageEn:
      typeof blocksEn.welcomeMessageEn === 'string' ? blocksEn.welcomeMessageEn : '',
    impactStats: Array.isArray(blocksEn.impactStats) ? (blocksEn.impactStats as ImpactStat[]) : [],
  };
}

function currency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  const { title, description, image } = defaultSeoFields(settings);
  return buildMetadata({ locale, path: '/', title, description, image });
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const tCommon = await getTranslations('Common');
  const tDonate = await getTranslations('Donate');

  const [settings, banners, activities, events, posts, appeals, testimonials, homeContent, albums] =
    await Promise.all([
      getSiteSettings(),
      getHeroBanners(),
      getActivities(),
      getPublicEvents(),
      getPublicNewsPosts(),
      getAppeals(),
      getTestimonials(),
      getPageContent('home'),
      getGalleryAlbums(),
    ]);

  const home = parseHomeBlocks(homeContent.blocksEn);
  const upcomingEvents = events
    .filter((event) => new Date(event.startDate) >= new Date())
    .slice(0, 3);
  const latestPosts = posts.slice(0, 3);
  const featuredActivities = activities.slice(0, 3);
  const featuredAppeal = appeals[0];
  const galleryPreviewItems = albums.flatMap((album) => album.items).slice(0, 8);

  return (
    <div>
      <JsonLd data={ngoJsonLd(settings, env.NEXT_PUBLIC_SITE_URL)} />

      <HeroBannerSection banners={banners} />

      {home.welcomeMessageEn && (
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <div
            className="text-pub-neutral-900 prose-p:mb-3 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(home.welcomeMessageEn) }}
          />
        </section>
      )}

      {home.impactStats.length > 0 && (
        <section className="bg-pub-neutral-50 px-4 py-14 sm:px-6">
          <SectionHeading title={t('impactStatsHeading')} />
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {home.impactStats.map((stat, index) => (
              <StatCard key={index} value={stat.valueEn} label={stat.labelEn} />
            ))}
          </div>
        </section>
      )}

      {featuredActivities.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading title={t('activitiesHeading')} subtitle={t('activitiesSubheading')} />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} locale={locale} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              render={<Link href="/activities" />}
              className="border-pub-primary-700 text-pub-primary-700"
            >
              {tCommon('viewAll')}
            </Button>
          </div>
        </section>
      )}

      {featuredAppeal && (
        <section className="bg-pub-primary-900 px-4 py-14 text-white sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-pub-gold-500 mb-2 text-xs font-semibold tracking-widest uppercase">
              {t('appealHeading')}
            </p>
            <h2 className="font-pub-heading text-2xl font-semibold sm:text-3xl">
              {locale === 'te' && featuredAppeal.titleTe
                ? featuredAppeal.titleTe
                : featuredAppeal.titleEn}
            </h2>
            <div className="mt-6">
              <ProgressBar
                value={Number(featuredAppeal.raisedAmountCache)}
                max={Number(featuredAppeal.targetAmount)}
                className="bg-white/20"
              />
              <div className="mt-2 flex justify-between text-sm text-white/80">
                <span>
                  {tDonate('raised')}: {currency(featuredAppeal.raisedAmountCache)}
                </span>
                <span>
                  {tDonate('target')}: {currency(featuredAppeal.targetAmount)}
                </span>
              </div>
            </div>
            <Button
              render={<Link href="/donate" />}
              size="lg"
              className="bg-pub-gold-500 hover:bg-pub-gold-700 text-pub-primary-900 mt-6"
            >
              {tCommon('donateNow')}
            </Button>
          </div>
        </section>
      )}

      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading title={t('eventsHeading')} />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} locale={locale} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              render={<Link href="/events" />}
              className="border-pub-primary-700 text-pub-primary-700"
            >
              {tCommon('viewAll')}
            </Button>
          </div>
        </section>
      )}

      {latestPosts.length > 0 && (
        <section className="bg-pub-neutral-50 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-7xl lg:px-8">
            <SectionHeading title={t('newsHeading')} />
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <NewsCard key={post.id} post={post} locale={locale} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                render={<Link href="/news" />}
                className="border-pub-primary-700 text-pub-primary-700"
              >
                {tCommon('viewAll')}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading title={t('testimonialsHeading')} />
        <div className="mt-8">
          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </section>

      {galleryPreviewItems.length > 0 && (
        <section className="bg-pub-neutral-50 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-7xl lg:px-8">
            <SectionHeading title={t('galleryHeading')} />
            <div className="mt-8">
              <GalleryGrid items={galleryPreviewItems} locale={locale} />
            </div>
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                render={<Link href="/gallery" />}
                className="border-pub-primary-700 text-pub-primary-700"
              >
                {tCommon('viewAll')}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-px sm:grid-cols-2">
        <div className="bg-pub-primary-700 flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-white">
          <h2 className="font-pub-heading text-xl font-semibold">{t('volunteerCtaHeading')}</h2>
          <p className="max-w-sm text-sm text-white/85">{t('volunteerCtaBody')}</p>
          <Button
            render={<Link href="/volunteer" />}
            className="bg-pub-gold-500 hover:bg-pub-gold-700 text-pub-primary-900 mt-2"
          >
            {tCommon('register')}
          </Button>
        </div>
        <div className="bg-pub-gold-700 flex flex-col items-center justify-center gap-3 px-6 py-14 text-center text-white">
          <h2 className="font-pub-heading text-xl font-semibold">{t('contactCtaHeading')}</h2>
          <p className="max-w-sm text-sm text-white/85">{t('contactCtaBody')}</p>
          <Button
            render={<Link href="/contact" />}
            variant="outline"
            className="mt-2 border-white bg-transparent text-white hover:bg-white/10"
          >
            {tCommon('learnMore')}
          </Button>
        </div>
      </section>

      <section className="px-4 py-14 text-center sm:px-6">
        <SectionHeading title={t('newsletterHeading')} subtitle={t('newsletterBody')} />
        <div className="mt-6 flex justify-center">
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
