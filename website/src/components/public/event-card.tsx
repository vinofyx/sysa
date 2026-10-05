'use client';

import * as React from 'react';
import Image from 'next/image';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/public/motion';
import { StatusBadge } from '@/components/public/status-badge';
import { translateEventLocation } from '@/lib/location-labels';
import type { PublicEvent } from '@/types/public';

export function EventCard({
  event,
  locale,
  index = 0,
}: {
  event: PublicEvent;
  locale: string;
  index?: number;
}) {
  const t = useTranslations('Common');
  const tEvents = useTranslations('Events');
  const title = locale === 'te' && event.titleTe ? event.titleTe : event.titleEn;
  const date = new Date(event.startDate).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const isPast = new Date(event.startDate) < new Date();
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <Reveal delay={index * 0.08} className="h-full">
      <Link
        href={`/events/${event.slug}`}
        className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-xl bg-pub-neutral-white group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-pub-card)] border transition-all duration-500 hover:-translate-y-1"
      >
        <div className="bg-pub-primary-100 dark:bg-pub-primary-900/30 relative aspect-[16/10] overflow-hidden">
          {event.featuredImageUrl && !imageFailed ? (
            <Image
              src={event.featuredImageUrl}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="pub-gradient-emerald flex size-full items-center justify-center">
              <CalendarDays className="text-pub-gold-300 size-12" strokeWidth={1.5} />
            </div>
          )}
          <div className="from-pub-primary-950/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {isPast && (
            <span className="absolute top-3 right-3">
              <StatusBadge status="completed" label={tEvents('past')} />
            </span>
          )}
          <span className="pub-gradient-gold text-pub-primary-950 shadow-pub-sm absolute bottom-3 left-3 flex flex-col items-center rounded-lg px-2.5 py-1 text-center leading-none">
            <span className="text-[0.6rem] font-bold tracking-wide uppercase">
              {date.split(' ')[1]?.replace(',', '')}
            </span>
            <span className="text-sm font-extrabold">{date.split(' ')[0]}</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-6">
          {event.category && (
            <p className="text-pub-gold-700 text-xs font-semibold tracking-wide uppercase">
              {locale === 'te' && event.category.nameTe
                ? event.category.nameTe
                : event.category.nameEn}
            </p>
          )}
          <h3 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-lg font-semibold">
            {title}
          </h3>
          <div className="text-pub-neutral-500 mt-1 flex items-center gap-1.5 text-xs">
            <CalendarDays className="size-3.5" /> {date}
          </div>
          {event.location && (
            <div className="text-pub-neutral-500 flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5" /> {translateEventLocation(event.location, locale)}
            </div>
          )}
          <span className="text-pub-gold-700 group-hover:text-pub-gold-500 mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold transition-colors">
            {t('readMore')}
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
