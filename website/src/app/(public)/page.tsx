import type { Metadata } from 'next';
import Image from 'next/image';
import {
  HeartHandshake,
  MessageCircleHeart,
  Users,
  HandHeart,
  CalendarHeart,
  UtensilsCrossed,
  GraduationCap,
  HeartPulse,
  Gift,
  Eye,
  Target,
  ShieldCheck,
  Check,
} from 'lucide-react';
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
import { parseAboutBlocks } from '@/lib/about-content';
import { buildMetadata, defaultSeoFields, ngoJsonLd } from '@/lib/seo';
import { sanitizeRichText } from '@/lib/sanitize';
import { decodeHtmlEntities } from '@/lib/strip-html';
import { env } from '@/lib/env';

/** Plain-text lead-in for the homepage About teaser — strips markup and
 * truncates at a word boundary. Reuses the real About-page copy (never
 * invents new marketing copy); the full version is one click away at
 * `/about`. */
function excerpt(html: string, maxLength: number): string {
  const text = decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

interface ImpactStat {
  valueEn: string;
  valueTe?: string;
  labelEn: string;
  labelTe?: string;
}

interface HomeBlocks {
  welcomeMessageEn: string;
  welcomeMessageTe?: string;
  impactStats: ImpactStat[];
}

/** Reads both `blocksEn` and `blocksTe` (mirroring `parseAboutBlocks`'s
 * pattern) so a Telugu welcome message / impact-stat set is picked up on
 * /te/ the moment an admin adds one — the admin Home editor doesn't yet
 * expose Telugu inputs for this block (unlike the About editor), so in
 * practice `blocksTe` is empty today and callers fall back to `-En`. */
function parseHomeBlocks(blocksEn: Record<string, unknown>, blocksTe: unknown): HomeBlocks {
  const te = (blocksTe ?? {}) as Record<string, unknown>;
  return {
    welcomeMessageEn:
      typeof blocksEn.welcomeMessageEn === 'string' ? blocksEn.welcomeMessageEn : '',
    welcomeMessageTe: typeof te.welcomeMessageEn === 'string' ? te.welcomeMessageEn : undefined,
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
  const { title, description, image } = defaultSeoFields(settings, locale);
  return buildMetadata({ locale, path: '/', title, description, image });
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const tCommon = await getTranslations('Common');
  const tDonate = await getTranslations('Donate');

  const [
    settings,
    banners,
    activities,
    events,
    posts,
    appeals,
    testimonials,
    homeContent,
    aboutContent,
    albums,
  ] = await Promise.all([
    getSiteSettings(),
    getHeroBanners(),
    getActivities(),
    getPublicEvents(),
    getPublicNewsPosts(),
    getAppeals(),
    getTestimonials(),
    getPageContent('home'),
    getPageContent('about'),
    getGalleryAlbums(),
  ]);

  const home = parseHomeBlocks(homeContent.blocksEn, homeContent.blocksTe);
  const welcomeMessage =
    locale === 'te' && home.welcomeMessageTe ? home.welcomeMessageTe : home.welcomeMessageEn;
  const aboutBlocks = parseAboutBlocks(aboutContent);
  const aboutTeaser = excerpt(
    (locale === 'te' && aboutBlocks.aboutTe ? aboutBlocks.aboutTe : aboutBlocks.aboutEn) || '',
    260,
  );
  const upcomingEvents = events
    .filter((event) => new Date(event.startDate) >= new Date())
    .slice(0, 3);
  const latestPosts = posts.slice(0, 3);
  const featuredActivities = activities.slice(0, 3);
  const featuredAppeal = appeals[0];
  const galleryPreviewItems = albums.flatMap((album) => album.items).slice(0, 8);

  const elderlyCarePoints = [
    t('elderlyCarePoint1'),
    t('elderlyCarePoint2'),
    t('elderlyCarePoint3'),
    t('elderlyCarePoint4'),
    t('elderlyCarePoint5'),
    t('elderlyCarePoint6'),
  ];

  const waysToSupport = [
    {
      Icon: Gift,
      title: t('supportDonateTitle'),
      description: t('supportDonateDescription'),
      cta: t('supportDonateCta'),
      href: '/donate#online-donation',
    },
    {
      Icon: UtensilsCrossed,
      title: t('supportMealTitle'),
      description: t('supportMealDescription'),
      cta: t('supportMealCta'),
      href: '/donate?category=ANNAPRASADAM#online-donation',
    },
    {
      Icon: GraduationCap,
      title: t('supportEducationTitle'),
      description: t('supportEducationDescription'),
      cta: t('supportEducationCta'),
      href: '/donate?category=ADOPT_A_STUDENT#online-donation',
    },
    {
      Icon: HeartPulse,
      title: t('supportMedicalTitle'),
      description: t('supportMedicalDescription'),
      cta: t('supportMedicalCta'),
      href: '/donate?category=EMERGENCY_MEDICAL_FUND#online-donation',
    },
    {
      Icon: HandHeart,
      title: t('supportVolunteerTitle'),
      description: t('supportVolunteerDescription'),
      cta: t('supportVolunteerCta'),
      href: '/volunteer',
    },
    {
      Icon: Users,
      title: t('supportMembershipTitle'),
      description: t('supportMembershipDescription'),
      cta: t('supportMembershipCta'),
      href: '/donate?category=MEMBERSHIP#online-donation',
    },
  ];

  const annaprasadamOccasions = [
    t('annaprasadamOccasion1'),
    t('annaprasadamOccasion2'),
    t('annaprasadamOccasion3'),
    t('annaprasadamOccasion4'),
  ];

  return (
    <div>
      <JsonLd data={ngoJsonLd(settings, env.NEXT_PUBLIC_SITE_URL)} />

      <HeroBannerSection banners={banners} settings={settings} />

      {home.impactStats.length > 0 ? (
        <section className="pub-gradient-emerald relative scroll-mt-16 overflow-hidden px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
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
              eyebrow={t('impactStatsEyebrow')}
              title={t('impactStatsHeading')}
              className="[&_h2]:text-white [&_p]:text-white/70"
            />
            <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-8">
              {home.impactStats.map((stat, index) => (
                <StatCard
                  key={index}
                  value={locale === 'te' && stat.valueTe ? stat.valueTe : stat.valueEn}
                  label={locale === 'te' && stat.labelTe ? stat.labelTe : stat.labelEn}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="pub-gradient-emerald relative scroll-mt-16 overflow-hidden px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
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
              eyebrow={t('impactStatsEyebrow')}
              title={t('impactStatsHeading')}
              className="[&_h2]:text-white [&_p]:text-white/70"
            />
            {/* Qualitative statements, not invented figures — every fact here
                (resident capacity, founding year, member count) is already
                published on /about; this just carries it forward in prose
                rather than a numeric KPI tile, since there's no admin-entered
                `impactStats` record to source precise numbers from. */}
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:divide-x sm:divide-white/15">
              {[
                { Icon: HandHeart, text: t('impactQualitativeCare') },
                { Icon: Users, text: t('impactQualitativeMembers') },
                { Icon: CalendarHeart, text: t('impactQualitativeSince') },
              ].map(({ Icon, text }, index) => (
                <Reveal
                  key={index}
                  variant="scale"
                  delay={index * 0.08}
                  className="text-center sm:px-8"
                >
                  <Icon className="text-pub-gold-300 mx-auto size-8" strokeWidth={1.5} />
                  <p className="font-pub-heading mt-4 text-lg leading-snug font-medium text-white sm:text-xl">
                    {text}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {welcomeMessage && (
        <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <div
              className="font-pub-body text-pub-neutral-700 prose-p:mb-4 text-lg leading-loose"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(welcomeMessage) }}
            />
          </Reveal>
        </section>
      )}

      {aboutTeaser && (
        <section className="mx-auto grid max-w-[1400px] scroll-mt-16 grid-cols-1 items-center gap-12 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:grid-cols-2 lg:gap-16 lg:px-8">
          <Reveal variant="slide-right" className="relative">
            <div className="shadow-pub-xl relative aspect-[3/2] overflow-hidden rounded-[var(--radius-pub-lg)]">
              <Image
                src="/images/real/founders.jpg"
                alt={t('aboutTeaserImageAlt')}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="from-pub-primary-950/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            </div>
            <span className="pub-gradient-gold shadow-pub-gold absolute -bottom-5 left-6 h-1.5 w-20 rounded-full sm:left-10" />
            <span className="pub-glass text-pub-primary-900 dark:text-pub-neutral-900 shadow-pub-sm absolute top-5 right-5 rounded-[var(--radius-pub-pill)] px-4 py-2 text-xs font-semibold tracking-wide">
              {t('impactQualitativeSince')}
            </span>
          </Reveal>
          <Reveal variant="slide-left">
            <p className="text-pub-gold-700 mb-3 flex items-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
              <span className="pub-gradient-gold h-px w-6" />
              {t('aboutTeaserEyebrow')}
            </p>
            <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-3xl leading-[1.15] font-semibold text-balance sm:text-4xl">
              {locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn}
            </h2>
            <span className="pub-divider-gold mt-5" />
            <p className="text-pub-neutral-700 mt-5 text-base leading-relaxed">{aboutTeaser}</p>
            <PremiumButton render={<Link href="/about" />} tone="emerald" className="mt-8">
              {tCommon('learnMore')}
            </PremiumButton>
          </Reveal>
        </section>
      )}

      {featuredActivities.length > 0 && (
        <section className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:px-8">
          <SectionHeading
            eyebrow={t('activitiesEyebrow')}
            title={t('activitiesHeading')}
            subtitle={t('activitiesSubheading')}
          />
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
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

      <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
        <div className="mx-auto max-w-[1400px]">
          <SectionHeading
            eyebrow={t('impactSectionEyebrow')}
            title={t('impactSectionHeading')}
            subtitle={t('impactSectionDescription')}
          />
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: HeartHandshake,
                title: t('impactCareTitle'),
                text: t('impactCareDescription'),
              },
              {
                Icon: UtensilsCrossed,
                title: t('impactNourishmentTitle'),
                text: t('impactNourishmentDescription'),
              },
              {
                Icon: GraduationCap,
                title: t('impactEducationTitle'),
                text: t('impactEducationDescription'),
              },
              {
                Icon: HeartPulse,
                title: t('impactHealthTitle'),
                text: t('impactHealthDescription'),
              },
            ].map(({ Icon, title, text }, index) => (
              <Reveal key={index} delay={index * 0.08}>
                <span className="bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/30 dark:text-pub-gold-300 mb-4 flex size-12 items-center justify-center rounded-full">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-lg font-semibold">
                  {title}
                </h3>
                <p className="text-pub-neutral-500 mt-2 text-sm leading-relaxed">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {featuredAppeal && (
        <section className="pub-gradient-emerald relative scroll-mt-16 overflow-hidden px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
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
            <PremiumButton
              render={<Link href="/donate#online-donation" />}
              size="lg"
              className="mt-8"
            >
              {tCommon('donateNow')}
            </PremiumButton>
          </Reveal>
        </section>
      )}

      <section className="mx-auto grid max-w-[1400px] scroll-mt-16 grid-cols-1 items-center gap-12 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal variant="slide-left" className="order-2 lg:order-1">
          <p className="text-pub-gold-700 mb-3 flex items-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
            <span className="pub-gradient-gold h-px w-6" />
            {t('elderlyCareEyebrow')}
          </p>
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-3xl leading-[1.15] font-semibold text-balance sm:text-4xl">
            {t('elderlyCareHeading')}
          </h2>
          <span className="pub-divider-gold mt-5" />
          <p className="text-pub-neutral-700 mt-5 text-base leading-relaxed">
            {t('elderlyCareContent')}
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {elderlyCarePoints.map((point) => (
              <li key={point} className="text-pub-neutral-700 flex items-center gap-2 text-sm">
                <Check className="text-pub-gold-700 size-4 shrink-0" strokeWidth={2.5} />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <PremiumButton render={<Link href="/activities/vanaprasthasramam" />} tone="emerald">
              {t('elderlyCarePrimaryCta')}
            </PremiumButton>
            <PremiumButton
              render={<Link href="/donate?category=OLD_AGE_HOME#online-donation" />}
              tone="emerald"
            >
              {t('elderlyCareSecondaryCta')}
            </PremiumButton>
          </div>
        </Reveal>
        <Reveal variant="slide-right" className="relative order-1 lg:order-2">
          <div className="shadow-pub-xl relative aspect-[4/3] overflow-hidden rounded-[var(--radius-pub-lg)]">
            <Image
              src="/images/real/residents-activities.jpg"
              alt={t('elderlyCareHeading')}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <span className="pub-gradient-gold shadow-pub-gold absolute right-6 -bottom-5 h-1.5 w-20 rounded-full sm:right-10" />
        </Reveal>
      </section>

      <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
        <div className="mx-auto max-w-[1400px]">
          <SectionHeading
            eyebrow={t('waysToSupportEyebrow')}
            title={t('waysToSupportHeading')}
            subtitle={t('waysToSupportDescription')}
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {waysToSupport.map(({ Icon, title, description, cta, href }, index) => (
              <Reveal key={title} delay={index * 0.06} className="h-full">
                <div className="border-pub-neutral-200/70 shadow-pub-sm hover:shadow-pub-lg bg-pub-neutral-white flex h-full flex-col rounded-[var(--radius-pub-card)] border p-6 transition-all duration-500 hover:-translate-y-1">
                  <span className="bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/30 dark:text-pub-gold-300 mb-4 flex size-11 items-center justify-center rounded-full">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <p className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-lg font-semibold">
                    {title}
                  </p>
                  <p className="text-pub-neutral-500 mt-2 flex-1 text-sm leading-relaxed">
                    {description}
                  </p>
                  <Link
                    href={href}
                    className="text-pub-gold-700 hover:text-pub-gold-500 mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                  >
                    {cta} →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] scroll-mt-16 grid-cols-1 items-center gap-12 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal variant="slide-right" className="relative">
          <div className="shadow-pub-xl relative aspect-[4/3] overflow-hidden rounded-[var(--radius-pub-lg)]">
            <Image
              src="/images/real/annaprasadam-hall.jpg"
              alt={t('annaprasadamFeatureHeading')}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <span className="pub-gradient-gold shadow-pub-gold absolute -bottom-5 left-6 h-1.5 w-20 rounded-full sm:left-10" />
        </Reveal>
        <Reveal variant="slide-left">
          <p className="text-pub-gold-700 mb-3 flex items-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
            <span className="pub-gradient-gold h-px w-6" />
            {t('annaprasadamFeatureEyebrow')}
          </p>
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-3xl leading-[1.15] font-semibold text-balance sm:text-4xl">
            {t('annaprasadamFeatureHeading')}
          </h2>
          <span className="pub-divider-gold mt-5" />
          <p className="text-pub-neutral-700 mt-5 text-base leading-relaxed">
            {t('annaprasadamFeatureContent')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {annaprasadamOccasions.map((occasion) => (
              <span
                key={occasion}
                className="bg-pub-gold-100 text-pub-gold-800 rounded-[var(--radius-pub-pill)] px-3.5 py-1.5 text-xs font-semibold"
              >
                {occasion}
              </span>
            ))}
          </div>
          <p className="text-pub-primary-900 dark:text-pub-neutral-900 mt-5 text-base leading-relaxed italic">
            {t('annaprasadamQuote')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PremiumButton render={<Link href="/donate?category=ANNAPRASADAM#online-donation" />}>
              {t('annaprasadamPrimaryCta')}
            </PremiumButton>
            <PremiumButton render={<Link href="/activities/annaprasadam" />} tone="emerald">
              {t('annaprasadamSecondaryCta')}
            </PremiumButton>
          </div>
        </Reveal>
      </section>

      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:px-8">
          <SectionHeading eyebrow={t('eventsEyebrow')} title={t('eventsHeading')} />
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
        <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
          <div className="mx-auto max-w-[1400px] lg:px-8">
            <SectionHeading eyebrow={t('newsEyebrow')} title={t('newsHeading')} />
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

      <section className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:px-8">
        <SectionHeading eyebrow={t('testimonialsEyebrow')} title={t('testimonialsHeading')} />
        <div className="mt-14">
          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </section>

      {galleryPreviewItems.length > 0 && (
        <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
          <div className="mx-auto max-w-[1400px] lg:px-8">
            <SectionHeading eyebrow={t('galleryEyebrow')} title={t('galleryHeading')} />
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

      <section className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px] lg:px-8">
        <SectionHeading eyebrow={t('visionMissionEyebrow')} title={t('visionMissionHeading')} />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[
            {
              Icon: Eye,
              label: t('visionLabel'),
              title: t('visionTeaserTitle'),
              description: t('visionTeaserDescription'),
              cta: t('visionCta'),
              href: '/about/vision',
              image: '/images/illustrations/our-vision.jpg',
            },
            {
              Icon: Target,
              label: t('missionLabel'),
              title: t('missionTeaserTitle'),
              description: t('missionTeaserDescription'),
              cta: t('missionCta'),
              href: '/about/mission',
              image: '/images/illustrations/our-mission.jpg',
            },
          ].map(({ Icon, label, title, description, cta, href, image }, index) => (
            <Reveal key={label} delay={index * 0.08} className="h-full">
              <div className="border-pub-neutral-200/70 shadow-pub-sm bg-pub-neutral-white flex h-full flex-col rounded-[var(--radius-pub-card)] border p-8">
                {image && (
                  <div className="relative -mx-8 -mt-8 mb-6 h-[215px] overflow-hidden rounded-t-[var(--radius-pub-card)] sm:h-[240px]">
                    <Image
                      src={image}
                      alt={title}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                )}
                <span className="bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/30 dark:text-pub-gold-300 mb-4 flex size-12 items-center justify-center rounded-full">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <p className="text-pub-gold-700 text-xs font-semibold tracking-[0.18em] uppercase">
                  {label}
                </p>
                <h3 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 mt-2 text-xl font-semibold">
                  {title}
                </h3>
                <p className="text-pub-neutral-500 mt-3 flex-1 text-sm leading-relaxed">
                  {description}
                </p>
                <Link
                  href={href}
                  className="text-pub-gold-700 hover:text-pub-gold-500 mt-5 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                >
                  {cta} →
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pub-gradient-ivory scroll-mt-16 px-4 py-20 text-center sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]">
        <Reveal className="mx-auto max-w-2xl">
          <span className="bg-pub-primary-100 text-pub-primary-700 dark:bg-pub-primary-900/30 dark:text-pub-gold-300 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <ShieldCheck className="size-5" strokeWidth={1.5} />
          </span>
          <p className="text-pub-gold-700 mb-3 flex items-center justify-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
            <span className="pub-gradient-gold h-px w-6" />
            {t('transparencyEyebrow')}
          </p>
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-2xl font-semibold sm:text-3xl">
            {t('transparencyHeading')}
          </h2>
          <p className="text-pub-neutral-700 mt-4 text-base leading-relaxed">
            {t('transparencyContent')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
            <Link
              href="/about"
              className="text-pub-primary-700 dark:text-pub-gold-300 hover:underline"
            >
              {t('transparencyAboutLink')}
            </Link>
            <Link
              href="/about/committee"
              className="text-pub-primary-700 dark:text-pub-gold-300 hover:underline"
            >
              {t('transparencyCommitteeLink')}
            </Link>
            <Link
              href="/contact"
              className="text-pub-primary-700 dark:text-pub-gold-300 hover:underline"
            >
              {t('transparencyContactLink')}
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="grid scroll-mt-16 grid-cols-1 sm:scroll-mt-[70px] sm:grid-cols-2 lg:scroll-mt-[76px]">
        <Reveal
          variant="slide-right"
          className="pub-gradient-emerald relative flex flex-col items-center justify-center gap-4 overflow-hidden px-6 py-16 text-center text-white sm:py-20"
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
          className="text-pub-primary-950 dark:text-pub-neutral-900 relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-[linear-gradient(160deg,var(--color-pub-gold-100)_0%,var(--color-pub-neutral-bg)_70%)] px-6 py-16 text-center sm:py-20"
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

      <Reveal
        variant="scale"
        className="pub-gradient-emerald relative scroll-mt-16 overflow-hidden px-4 py-20 text-center text-white sm:scroll-mt-[70px] sm:px-6 sm:py-28 lg:scroll-mt-[76px]"
      >
        <div
          aria-hidden
          className="pub-gradient-gold absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-pub-gold-300 mb-3 flex items-center justify-center gap-2.5 text-xs font-semibold tracking-[0.22em] uppercase">
            <span className="pub-gradient-gold h-px w-6" />
            {t('finalCtaEyebrow')}
          </p>
          <h2 className="font-pub-heading text-2xl font-semibold sm:text-4xl">
            {t('finalCtaHeading')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t('finalCtaDescription')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <PremiumButton render={<Link href="/donate#online-donation" />} size="lg">
              {tCommon('donateNow')}
            </PremiumButton>
            <PremiumButton render={<Link href="/volunteer" />} tone="ghost-light" size="lg">
              {tCommon('register')}
            </PremiumButton>
            <PremiumButton render={<Link href="/contact" />} tone="ghost-light" size="lg">
              {t('finalCtaContact')}
            </PremiumButton>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
