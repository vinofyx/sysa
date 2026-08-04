import Image from 'next/image';
import { CalendarDays, MapPin } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { StatusBadge } from '@/components/public/status-badge';
import type { PublicEvent } from '@/types/public';

export function EventCard({ event, locale }: { event: PublicEvent; locale: string }) {
  const title = locale === 'te' && event.titleTe ? event.titleTe : event.titleEn;
  const date = new Date(event.startDate).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const isPast = new Date(event.startDate) < new Date();

  return (
    <Link
      href={`/events/${event.slug}`}
      className="border-pub-neutral-200 shadow-pub-sm hover:shadow-pub-md group flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow"
    >
      <div className="bg-pub-primary-100 relative aspect-[16/9]">
        {event.featuredImageUrl ? (
          <Image
            src={event.featuredImageUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <CalendarDays className="text-pub-primary-700 size-10" />
          </div>
        )}
        {isPast && (
          <span className="absolute top-2 right-2">
            <StatusBadge status="completed" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {event.category && (
          <p className="text-pub-gold-700 text-xs font-semibold tracking-wide uppercase">
            {locale === 'te' && event.category.nameTe
              ? event.category.nameTe
              : event.category.nameEn}
          </p>
        )}
        <h3 className="font-pub-heading text-pub-primary-900 text-base font-semibold">{title}</h3>
        <div className="text-pub-neutral-500 mt-1 flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3.5" /> {date}
        </div>
        {event.location && (
          <div className="text-pub-neutral-500 flex items-center gap-1.5 text-xs">
            <MapPin className="size-3.5" /> {event.location}
          </div>
        )}
      </div>
    </Link>
  );
}
