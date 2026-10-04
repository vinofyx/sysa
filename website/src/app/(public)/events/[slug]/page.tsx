import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CalendarDays, MapPin } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { EventRegistrationForm } from '@/components/public/event-registration-form';
import { ShareButtons } from '@/components/public/share-buttons';
import { JsonLd } from '@/components/public/json-ld';
import { getPublicEventBySlug, getSiteSettings } from '@/lib/public-api';
import { breadcrumbJsonLd, buildMetadata, eventJsonLd } from '@/lib/seo';
import { translateEventLocation } from '@/lib/location-labels';
import { stripHtml } from '@/lib/strip-html';
import { env } from '@/lib/env';
import { events } from '@/content/events';

interface Props {
  params: Promise<{ slug: string }>;
}

// Required by `output: 'export'` — see activities/[slug]/page.tsx for why
// only `slug` needs to be returned here.
export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const event = await getPublicEventBySlug(slug);
  if (!event) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && event.titleTe ? event.titleTe : event.titleEn;
  // `metaTitleEn`/`metaDescriptionEn` are admin-set SEO overrides with no
  // Telugu counterpart in the schema — only apply them for English, so a
  // Telugu page never surfaces an English-only meta override; Telugu falls
  // through to the already locale-aware title/description below instead.
  const descriptionSource =
    locale === 'te' && event.descriptionTe ? event.descriptionTe : event.descriptionEn;
  const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;
  const description =
    (locale !== 'te' ? event.metaDescriptionEn : undefined) ??
    (descriptionSource ? stripHtml(descriptionSource) : undefined)?.slice(0, 160) ??
    tagline ??
    '';

  return buildMetadata({
    locale,
    path: `/events/${slug}`,
    title: (locale !== 'te' ? event.metaTitleEn : undefined) ?? `${title} — ${settings.siteNameEn}`,
    description,
    image: event.featuredImageUrl,
  });
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const t = await getTranslations('Nav');
  const tEvents = await getTranslations('Events');
  const title = locale === 'te' && event.titleTe ? event.titleTe : event.titleEn;
  const description =
    locale === 'te' && event.descriptionTe ? event.descriptionTe : event.descriptionEn;
  const date = new Date(event.startDate).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const url = `${env.NEXT_PUBLIC_SITE_URL}/events/${slug}`;
  const registrationClosed =
    event.status !== 'published' ||
    (event.registrationDeadline && new Date(event.registrationDeadline) < new Date());
  const capacityFull =
    !!event.capacity && !!event._count && event._count.registrations >= event.capacity;

  return (
    <div>
      <JsonLd
        data={eventJsonLd({
          titleEn: event.titleEn,
          descriptionEn: event.descriptionEn,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          featuredImageUrl: event.featuredImageUrl,
          url,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('home'), url: env.NEXT_PUBLIC_SITE_URL },
          { name: t('events'), url: `${env.NEXT_PUBLIC_SITE_URL}/events` },
          { name: title, url },
        ])}
      />
      <PageHero
        title={title}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('events'), href: '/events' },
          { label: title },
        ]}
      />
      {event.featuredImageUrl && (
        <div className="relative mx-auto h-64 max-w-5xl overflow-hidden rounded-xl sm:h-96">
          <Image src={event.featuredImageUrl} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="text-pub-neutral-500 mb-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" /> {date}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {translateEventLocation(event.location, locale)}
              </span>
            )}
          </div>
          <ShareButtons url={url} title={title} />
          <div className="mt-6">
            <RichContent html={description ?? ''} />
          </div>
        </div>
        <div>
          {registrationClosed ? (
            <div className="border-pub-neutral-200 bg-pub-neutral-white rounded-xl border p-6 text-center text-sm">
              {tEvents('registrationClosed')}
            </div>
          ) : (
            <EventRegistrationForm eventId={event.id} capacityFull={!!capacityFull} />
          )}
        </div>
      </div>
    </div>
  );
}
