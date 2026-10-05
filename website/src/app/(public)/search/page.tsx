import type { Metadata } from 'next';
import { CalendarDays, HeartHandshake, Newspaper, Search as SearchIcon } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { EmptyState } from '@/components/shared/empty-state';
import { StaticSearch } from '@/components/public/static-search';
import {
  getActivities,
  getPublicEvents,
  getPublicNewsPosts,
  getSiteSettings,
} from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';
import { isStaticExport } from '@/lib/static-mode';
import { stripHtml } from '@/lib/strip-html';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await getLocale();
  const settings = await getSiteSettings();
  const t = await getTranslations('Search');
  // Reading `searchParams` is a dynamic API that `output: 'export'` can't
  // prerender — the static build always emits the generic (query-less) title
  // instead of one reflecting the current search term.
  const q = isStaticExport ? undefined : (await searchParams).q;
  const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;
  return buildMetadata({
    locale,
    path: `/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    title: `${t('heading')} — ${settings.siteNameEn}`,
    description: tagline ?? settings.siteNameEn,
    noIndex: true,
  });
}

interface Result {
  type: 'activity' | 'news' | 'event';
  title: string;
  description: string | null;
  href: string;
}

/** Site-wide search — no dedicated search backend exists, so this queries
 * the same public content endpoints every listing page already uses and
 * filters client-side (server-rendered here) by title/description match.
 * Real content only, never a fabricated result set.
 *
 * Static export can't prerender a page that reads `searchParams` (there's no
 * server to read them from), so in that mode this never touches the prop at
 * all — it hands off to StaticSearch, a Client Component that reads the
 * query via `useSearchParams()` after hydration and filters the same
 * build-time content modules. Standalone/VPS mode is unchanged below. */
export default async function SearchPage({ searchParams }: Props) {
  if (isStaticExport) {
    return <StaticSearch />;
  }

  const locale = await getLocale();
  const { q } = await searchParams;
  const t = await getTranslations('Nav');
  const tSearch = await getTranslations('Search');
  const tCommon = await getTranslations('Common');

  let results: Result[] = [];

  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    const [activities, events, posts] = await Promise.all([
      getActivities(),
      getPublicEvents(),
      getPublicNewsPosts(),
    ]);

    // Matches against both languages regardless of the active locale — a
    // Telugu query should still find English-only content and vice versa,
    // and Telugu-typed queries need to match Telugu title/description text.
    const matches = (...fields: (string | null | undefined)[]) =>
      fields.some((field) => (field ?? '').toLowerCase().includes(query));
    const snippet = (source: string | null | undefined) =>
      source ? stripHtml(source).slice(0, 140) : null;

    results = [
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
      ...posts
        .filter((p) => matches(p.titleEn, p.titleTe, p.bodyEn, p.bodyTe))
        .map((p): Result => ({
          type: 'news',
          title: locale === 'te' && p.titleTe ? p.titleTe : p.titleEn,
          description: snippet(locale === 'te' && p.bodyTe ? p.bodyTe : p.bodyEn),
          href: `/news/${p.slug}`,
        })),
    ];
  }

  const typeIcon = { activity: HeartHandshake, event: CalendarDays, news: Newspaper } as const;

  return (
    <div>
      <PageHero
        title={tSearch('heading')}
        description={q ? `${tSearch('resultsFor')} "${q}"` : undefined}
        breadcrumb={[{ label: t('home'), href: '/' }, { label: tSearch('heading') }]}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <form className="mb-8 flex gap-2" action={`/search`} method="get">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={tSearch('placeholder')}
            className="border-pub-neutral-200 focus:border-pub-primary-700 h-10 flex-1 rounded-lg border px-3 text-sm outline-none"
          />
          <button
            type="submit"
            className="bg-pub-primary-700 hover:bg-pub-primary-500 flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white"
          >
            <SearchIcon className="size-4" /> {t('search')}
          </button>
        </form>

        {!q ? null : results.length === 0 ? (
          <EmptyState icon={SearchIcon} title={tCommon('noResults')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {results.map((result, index) => {
              const Icon = typeIcon[result.type];
              return (
                <li key={index}>
                  <Link
                    href={result.href}
                    className="border-pub-neutral-200 hover:border-pub-primary-700 bg-pub-neutral-white flex items-start gap-3 rounded-xl border p-4 transition-colors"
                  >
                    <Icon className="text-pub-primary-700 mt-0.5 size-5 shrink-0" />
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
        )}
      </div>
    </div>
  );
}
