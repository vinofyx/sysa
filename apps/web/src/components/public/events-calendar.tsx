'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { PublicEvent } from '@/types/public';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Minimal month-grid calendar (design/05-Wireframes.md Events "Calendar
 * View" toggle) — deliberately hand-rolled rather than adding a calendar
 * library, since the only requirement is "which days have events". */
export function EventsCalendar({ events, locale }: { events: PublicEvent[]; locale: string }) {
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, PublicEvent[]>();
    for (const event of events) {
      const key = new Date(event.startDate).toDateString();
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="rounded-full p-1.5 hover:bg-black/5"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-pub-heading text-pub-primary-900 text-sm font-semibold">
          {cursor.toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="rounded-full p-1.5 hover:bg-black/5"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-pub-neutral-500 py-1 font-medium">
            {day}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <div key={index} />;
          const dayEvents = eventsByDate.get(date.toDateString()) ?? [];
          return (
            <div
              key={index}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-xs ${
                dayEvents.length > 0 ? 'bg-pub-primary-100 text-pub-primary-900 font-semibold' : ''
              }`}
            >
              {date.getDate()}
              {dayEvents.length > 0 && (
                <span className="bg-pub-gold-500 mt-0.5 size-1.5 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
      {events.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {events
            .filter(
              (event) =>
                new Date(event.startDate).getMonth() === month &&
                new Date(event.startDate).getFullYear() === year,
            )
            .map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.slug}`}
                  className="text-pub-primary-700 text-sm hover:underline"
                >
                  {new Date(event.startDate).getDate()} —{' '}
                  {locale === 'te' && event.titleTe ? event.titleTe : event.titleEn}
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
