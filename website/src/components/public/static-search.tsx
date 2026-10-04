'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, HeartHandshake, Newspaper, Search as SearchIcon } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { EmptyState } from '@/components/shared/empty-state';
import { activities } from '@/content/activities';
import { events } from '@/content/events';
import { newsPosts } from '@/content/news';
import { stripHtml } from '@/lib/strip-html';

/**
 * Static-export counterpart of app/(public)/search/page.tsx —
 * reading `searchParams` on the server is a dynamic API that `output:
 * 'export'` can't prerender, so this reads the query client-side via
 * `useSearchParams()` instead and filters the same build-time content
 * modules `lib/public-api.ts` already serves in static mode. Standalone/VPS
 * mode never renders this component; it keeps using the live server page.
 *
 * `useSearchParams()` forces whatever calls it behind a Suspense boundary
 * during static export (Next.js can't read the real URL at build time, so it
 * prerenders the boundary's *fallback* into the static HTML and defers the
 * real content to the client). This file used to put the ENTIRE page —
 * PageHero, the search form, results, everything — inside one such boundary
 * with `fallback={null}`, which meant the whole page's <main> was empty
 * static HTML until that one boundary resolved client-side. Confirmed via
 * the generated output (`out/search/index.html`): the real markup was
 * present, just parked in a `<template id="S:0">` waiting on an inline
 * `$RC("B:0","S:0")` resolver script to relocate it — a mechanism that
 * depends on client-side completion with no visible content in between.
 *
 * Fix: only `SearchResults` (the part that actually needs `q`) sits behind
 * Suspense now. `StaticSearch` — the hero, heading, and search form, i.e.
 * the entire page except the results list — renders unconditionally, same
 * as every other page, so a donor always sees a working search box
 * immediately. The query-string prefill and "Results for X" hero subtitle
 * (both cosmetic reflections of `q`) now come from `window.location.search`
 * via a plain effect instead of `useSearchParams()`, specifically so they
 * don't pull the always-visible chrome back behind the same boundary.
 */

interface Result {
  type: 'activity' | 'news' | 'event';
  title: string;
  description: string | null;
  href: string;
}

const typeIcon = { activity: HeartHandshake, event: CalendarDays, news: Newspaper } as const;

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const locale = useLocale();
  const tCommon = useTranslations('Common');

  if (!q.trim()) return null;

  const query = q.trim().toLowerCase();
  // Matches against both languages regardless of the active locale — a
  // Telugu query should still find English-only content and vice versa,
  // and Telugu-typed queries need to match Telugu title/description text.
  const matches = (...fields: (string | null | undefined)[]) =>
    fields.some((field) => (field ?? '').toLowerCase().includes(query));
  const snippet = (source: string | null | undefined) =>
    source ? stripHtml(source).slice(0, 140) : null;

  const results: Result[] = [
    ...activities
      .filter((a) => matches(a.titleEn, a.titleTe, a.descriptionEn, a.descriptionTe))
      .map((a): Result => ({
        type: 'activity',
        title: locale === 'te' && a.titleTe ? a.titleTe : a.titleEn,
        description: snippet(
          locale === 'te' && a.descriptionTe ? a.descriptionTe : a.descriptionEn,
        ),
        href: `/activities/${a.slug}`,
      })),
    ...events
      .filter((e) => matches(e.titleEn, e.titleTe, e.descriptionEn, e.descriptionTe))
      .map((e): Result => ({
        type: 'event',
        title: locale === 'te' && e.titleTe ? e.titleTe : e.titleEn,
        description: snippet(
          locale === 'te' && e.descriptionTe ? e.descriptionTe : e.descriptionEn,
        ),
        href: `/events/${e.slug}`,
      })),
    ...newsPosts
      .filter((p) => matches(p.titleEn, p.titleTe, p.bodyEn, p.bodyTe))
      .map((p): Result => ({
        type: 'news',
        title: locale === 'te' && p.titleTe ? p.titleTe : p.titleEn,
        description: snippet(locale === 'te' && p.bodyTe ? p.bodyTe : p.bodyEn),
        href: `/news/${p.slug}`,
      })),
  ];

  if (results.length === 0) {
    return <EmptyState icon={SearchIcon} title={tCommon('noResults')} className="mt-4" />;
  }

  return (
    <ul className="mt-4 flex flex-col gap-4">
      {results.map((result, index) => {
        const Icon = typeIcon[result.type];
        return (
          <li key={index}>
            <Link
              href={result.href}
              className="border-pub-neutral-200 hover:border-pub-primary-700 bg-pub-neutral-white flex items-start gap-3 rounded-xl border p-4 transition-colors"
            >
              <Icon className="text-pub-primary-700 dark:text-pub-gold-300 mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-pub-heading text-pub-primary-900 dark:text-pub-neutral-900 text-sm font-semibold">
                  {result.title}
                </p>
                {result.description && (
                  <p className="text-pub-neutral-500 mt-1 text-xs">{result.description}</p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StaticSearch() {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const tSearch = useTranslations('Search');

  // Cosmetic only (input prefill + hero subtitle) — deliberately NOT
  // `useSearchParams()`, so this component never needs its own Suspense
  // boundary. Empty on the very first paint, filled in a moment later from
  // the real URL; the actual results list above still reads the query the
  // "proper" Next.js way via `useSearchParams()`.
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get('q') ?? '');
  }, []);

  return (
    <div>
      <PageHero
        title={tSearch('heading')}
        description={q ? `${tSearch('resultsFor')} "${q}"` : undefined}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: tSearch('heading') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <form className="flex gap-2" action={`/${locale}/search`} method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            key={q}
            placeholder={tSearch('placeholder')}
            className="border-pub-neutral-200 focus:border-pub-primary-700 bg-pub-neutral-white text-pub-neutral-900 h-10 flex-1 rounded-lg border px-3 text-sm outline-none"
          />
          <button
            type="submit"
            className="bg-pub-primary-700 hover:bg-pub-primary-500 flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white"
          >
            <SearchIcon className="size-4" /> {t('search')}
          </button>
        </form>

        <Suspense fallback={null}>
          <SearchResults />
        </Suspense>
      </div>
    </div>
  );
}
