import type { Metadata } from 'next';
import { HeartHandshake, MessageCircleHeart } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
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
import { PremiumButton } from '@/components/public/premium-button';
import { Reveal } from '@/components/public/motion';
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

      <HeroBannerSection banners={banners} settings={settings} />

      {home.welcomeMessageEn && (
        <section className="pub-gradient-ivory px-4 py-20 sm:px-6 sm:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div
              className="font-pub-body text-pub-neutral-700 prose-p:mb-4 text-lg leading-loose"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(home.welcomeMessageEn) }}
            />
          </Reveal>
        </section>
      )}

      {home.impactStats.length > 0 && (
        <section className="pub-gradient-emerald relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative mx-auto max-w-[1400px]">
            <SectionHeading
              eyebrow="By the numbers"
              title={t('impactStatsHeading')}
              className="[&_h2]:text-white [&_p]:text-white/70"
            />
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
              {home.impactStats.map((stat, index) => (
                <StatCard key={index} value={stat.valueEn} label={stat.labelEn} />
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredActivities.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading
            eyebrow="Our service"
            title={t('activitiesHeading')}
            subtitle={t('activitiesSubheading')}
          />
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredActivities.map((activity, index) => (
              <ActivityCard key={activity.id} activity={activity} locale={locale} index={index} />
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <PremiumButton render={<Link href="/activities" />} tone="emerald">
              {tCommon('viewAll')}
            </PremiumButton>
          </Reveal>
        </section>
      )}

      {featuredAppeal && (
        <section className="pub-gradient-emerald relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div
            aria-hidden
            className="pub-gradient-gold absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
          />
          <Reveal variant="scale" className="relative mx-auto max-w-2xl text-center">
            <p className="text-pub-gold-300 mb-3 flex items-center justify-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
              <span className="pub-gradient-gold h-px w-6" />
              {t('appealHeading')}
            </p>
            <h2 className="font-pub-heading text-2xl font-semibold text-white sm:text-4xl">
              {locale === 'te' && featuredAppeal.titleTe
                ? featuredAppeal.titleTe
                : featuredAppeal.titleEn}
            </h2>
            <div className="pub-glass-dark mt-8 rounded-[var(--radius-pub-card)] p-6 sm:p-8">
              <ProgressBar
                value={Number(featuredAppeal.raisedAmountCache)}
                max={Number(featuredAppeal.targetAmount)}
              />
              <div className="mt-3 flex justify-between text-sm text-white/80">
                <span>
                  {tDonate('raised')}: {currency(featuredAppeal.raisedAmountCache)}
                </span>
                <span>
                  {tDonate('target')}: {currency(featuredAppeal.targetAmount)}
                </span>
              </div>
            </div>
            <PremiumButton render={<Link href="/donate" />} size="lg" className="mt-8">
              {tCommon('donateNow')}
            </PremiumButton>
          </Reveal>
        </section>
      )}

      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <SectionHeading eyebrow="Save the date" title={t('eventsHeading')} />
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event, index) => (
              <EventCard key={event.id} event={event} locale={locale} index={index} />
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <PremiumButton render={<Link href="/events" />} tone="emerald">
              {tCommon('viewAll')}
            </PremiumButton>
          </Reveal>
        </section>
      )}

      {latestPosts.length > 0 && (
        <section className="pub-gradient-ivory px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-[1400px] lg:px-8">
            <SectionHeading eyebrow="Stay informed" title={t('newsHeading')} />
            <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post, index) => (
                <NewsCard key={post.id} post={post} locale={locale} index={index} />
              ))}
            </div>
            <Reveal className="mt-12 text-center">
              <PremiumButton render={<Link href="/news" />} tone="emerald">
                {tCommon('viewAll')}
              </PremiumButton>
            </Reveal>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <SectionHeading eyebrow="Testimonials" title={t('testimonialsHeading')} />
        <div className="mt-14">
          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </section>

      {galleryPreviewItems.length > 0 && (
        <section className="pub-gradient-ivory px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-[1400px] lg:px-8">
            <SectionHeading eyebrow="Moments" title={t('galleryHeading')} />
            <div className="mt-14">
              <GalleryGrid items={galleryPreviewItems} locale={locale} />
            </div>
            <Reveal className="mt-12 text-center">
              <PremiumButton render={<Link href="/gallery" />} tone="emerald">
                {tCommon('viewAll')}
              </PremiumButton>
            </Reveal>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2">
        <Reveal
          variant="slide-right"
          className="pub-gradient-emerald relative flex flex-col items-center justify-center gap-4 overflow-hidden px-6 py-20 text-center text-white sm:py-24"
        >
          <HeartHandshake className="text-pub-gold-300 size-10" strokeWidth={1.5} />
          <h2 className="font-pub-heading text-2xl font-semibold sm:text-3xl">
            {t('volunteerCtaHeading')}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/80">{t('volunteerCtaBody')}</p>
          <PremiumButton render={<Link href="/volunteer" />} className="mt-2">
            {tCommon('register')}
          </PremiumButton>
        </Reveal>
        <Reveal
          variant="slide-left"
          className="text-pub-primary-950 relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-[linear-gradient(160deg,var(--color-pub-gold-100)_0%,var(--color-pub-neutral-bg)_70%)] px-6 py-20 text-center sm:py-24"
        >
          <MessageCircleHeart className="text-pub-gold-700 size-10" strokeWidth={1.5} />
          <h2 className="font-pub-heading text-2xl font-semibold">{t('contactCtaHeading')}</h2>
          <p className="text-pub-neutral-700 max-w-sm text-sm leading-relaxed">
            {t('contactCtaBody')}
          </p>
          <PremiumButton render={<Link href="/contact" />} tone="emerald" className="mt-2">
            {tCommon('learnMore')}
          </PremiumButton>
        </Reveal>
      </section>

      <section className="pub-gradient-ivory px-4 py-20 text-center sm:px-6 sm:py-28">
        <SectionHeading title={t('newsletterHeading')} subtitle={t('newsletterBody')} />
        <Reveal className="mt-8 flex justify-center">
          <NewsletterForm />
        </Reveal>
      </section>
    </div>
  );
}
