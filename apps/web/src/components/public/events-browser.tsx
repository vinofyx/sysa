'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, LayoutList } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/public/event-card';
import { EventsCalendar } from '@/components/public/events-calendar';
import { EmptyState } from '@/components/admin/empty-state';
import type { PublicEvent } from '@/types/public';

export function EventsBrowser({ events, locale }: { events: PublicEvent[]; locale: string }) {
  const t = useTranslations('Events');
  const tCommon = useTranslations('Common');
  const [view, setView] = React.useState<'list' | 'calendar'>('list');

  const now = new Date();
  const upcoming = events
    .filter((event) => new Date(event.startDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const past = events
    .filter((event) => new Date(event.startDate) < now)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <Tabs defaultValue="upcoming">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="upcoming">{t('upcoming')}</TabsTrigger>
          <TabsTrigger value="past">{t('past')}</TabsTrigger>
        </TabsList>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label={t('listView')}
            className={`rounded-md p-2 ${view === 'list' ? 'bg-pub-primary-100 text-pub-primary-700' : 'text-pub-neutral-500'}`}
          >
            <LayoutList className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            aria-label={t('calendarView')}
            className={`rounded-md p-2 ${view === 'calendar' ? 'bg-pub-primary-100 text-pub-primary-700' : 'text-pub-neutral-500'}`}
          >
            <CalendarDays className="size-4" />
          </button>
        </div>
      </div>
      <TabsContent value="upcoming">
        <EventsList
          events={upcoming}
          view={view}
          locale={locale}
          emptyLabel={tCommon('noResults')}
        />
      </TabsContent>
      <TabsContent value="past">
        <EventsList events={past} view={view} locale={locale} emptyLabel={tCommon('noResults')} />
      </TabsContent>
    </Tabs>
  );
}

function EventsList({
  events,
  view,
  locale,
  emptyLabel,
}: {
  events: PublicEvent[];
  view: 'list' | 'calendar';
  locale: string;
  emptyLabel: string;
}) {
  if (events.length === 0) {
    return <EmptyState icon={CalendarDays} title={emptyLabel} className="mt-4" />;
  }

  if (view === 'calendar') {
    return (
      <div className="mt-4 max-w-md">
        <EventsCalendar events={events} locale={locale} />
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} locale={locale} />
      ))}
    </div>
  );
}
