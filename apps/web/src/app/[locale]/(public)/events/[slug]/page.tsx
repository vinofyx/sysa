import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CalendarDays, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { EventRegistrationForm } from '@/components/public/event-registration-form';
import { ShareButtons } from '@/components/public/share-buttons';
import { JsonLd } from '@/components/public/json-ld';
import { getPublicEventBySlug, getSiteSettings } from '@/lib/public-api';
import { breadcrumbJsonLd, buildMetadata, eventJsonLd } from '@/lib/seo';
import { env } from '@/lib/env';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && event.titleTe ? event.titleTe : event.titleEn;
  const description =
    event.metaDescriptionEn ??
    event.descriptionEn?.replace(/<[^>]+>/g, '').slice(0, 160) ??
    settings.taglineEn ??
    '';

  return buildMetadata({
    locale,
    path: `/events/${slug}`,
    title: event.metaTitleEn ?? `${title} — ${settings.siteNameEn}`,
    description,
    image: event.featuredImageUrl,
  });
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params;
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
  const url = `${env.NEXT_PUBLIC_SITE_URL}/${locale}/events/${slug}`;
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
          { name: t('events'), url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/events` },
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
          <Image
            src={event.featuredImageUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover"
          />
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
                <MapPin className="size-4" /> {event.location}
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
            <div className="border-pub-neutral-200 rounded-xl border bg-white p-6 text-center text-sm">
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
