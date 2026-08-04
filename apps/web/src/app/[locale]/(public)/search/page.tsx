import type { Metadata } from 'next';
import { CalendarDays, HeartHandshake, Newspaper, Search as SearchIcon } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { PageHero } from '@/components/public/page-hero';
import { EmptyState } from '@/components/admin/empty-state';
import {
  getActivities,
  getPublicEvents,
  getPublicNewsPosts,
  getSiteSettings,
} from '@/lib/public-api';
import { buildMetadata } from '@/lib/seo';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await getLocale();
  const { q } = await searchParams;
  const settings = await getSiteSettings();
  const t = await getTranslations('Search');
  return buildMetadata({
    locale,
    path: `/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    title: `${t('heading')} — ${settings.siteNameEn}`,
    description: settings.taglineEn ?? settings.siteNameEn,
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
 * Real content only, never a fabricated result set. */
export default async function SearchPage({ searchParams }: Props) {
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

    const matches = (title: string, description?: string | null) =>
      title.toLowerCase().includes(query) || (description ?? '').toLowerCase().includes(query);

    results = [
      ...activities
        .filter((a) => matches(a.titleEn, a.descriptionEn))
        .map((a): Result => ({
          type: 'activity',
          title: locale === 'te' && a.titleTe ? a.titleTe : a.titleEn,
          description: a.descriptionEn?.replace(/<[^>]+>/g, '').slice(0, 140) ?? null,
          href: `/activities/${a.slug}`,
        })),
      ...events
        .filter((e) => matches(e.titleEn, e.descriptionEn))
        .map((e): Result => ({
          type: 'event',
          title: locale === 'te' && e.titleTe ? e.titleTe : e.titleEn,
          description: e.descriptionEn?.replace(/<[^>]+>/g, '').slice(0, 140) ?? null,
          href: `/events/${e.slug}`,
        })),
      ...posts
        .filter((p) => matches(p.titleEn, p.bodyEn))
        .map((p): Result => ({
          type: 'news',
          title: locale === 'te' && p.titleTe ? p.titleTe : p.titleEn,
          description: p.bodyEn?.replace(/<[^>]+>/g, '').slice(0, 140) ?? null,
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
        <form className="mb-8 flex gap-2" action={`/${locale}/search`} method="get">
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
                    className="border-pub-neutral-200 hover:border-pub-primary-700 flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors"
                  >
                    <Icon className="text-pub-primary-700 mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-pub-heading text-pub-primary-900 text-sm font-semibold">
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
