'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Newspaper } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { NewsCard } from '@/components/public/news-card';
import { Reveal } from '@/components/public/motion';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { translateFreeTextCategory } from '@/lib/free-text-category-labels';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { stripHtml } from '@/lib/strip-html';
import type { NewsPost } from '@/types/public';

function FeaturedNewsCard({ post, locale }: { post: NewsPost; locale: string }) {
  const tCommon = useTranslations('Common');
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const body = locale === 'te' && post.bodyTe ? post.bodyTe : post.bodyEn;
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <Reveal className="mb-8">
      <Link
        href={`/news/${post.slug}`}
        className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-xl bg-pub-neutral-white group grid grid-cols-1 overflow-hidden rounded-[var(--radius-pub-card)] border transition-all duration-500 hover:-translate-y-1 lg:grid-cols-2"
      >
        <div className="bg-pub-primary-100 dark:bg-pub-primary-900/30 relative aspect-[16/10] overflow-hidden lg:aspect-auto">
          {post.featuredImageUrl && !imageFailed ? (
            <Image
              src={post.featuredImageUrl}
              alt={title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="pub-gradient-emerald flex size-full items-center justify-center">
              <Newspaper className="text-pub-gold-300 size-16" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-8 sm:p-10">
          {date && (
            <p className="text-pub-gold-700 text-xs font-semibold tracking-wide uppercase">
              {date}
            </p>
          )}
          <h2 className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-2xl font-semibold sm:text-3xl">
            {title}
          </h2>
          {body && (
            <p className="text-pub-neutral-500 line-clamp-3 text-base leading-relaxed">
              {stripHtml(body)}
            </p>
          )}
          <span className="text-pub-gold-700 group-hover:text-pub-gold-500 mt-2 inline-flex items-center gap-1 text-sm font-semibold transition-colors">
            {tCommon('readMore')}
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

const PAGE_SIZE = 9;

/** Search/category-filter/pagination happen client-side — `/news/public`
 * returns the full published set unpaginated (see news.routes.ts doc-comment),
 * so this is real filtering over real data, not fabricated UI. */
export function NewsBrowser({ posts, locale }: { posts: NewsPost[]; locale: string }) {
  const t = useTranslations('News');
  const tCommon = useTranslations('Common');
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  const categories = React.useMemo(
    () => Array.from(new Set(posts.map((post) => post.category).filter((c): c is string => !!c))),
    [posts],
  );

  const filtered = React.useMemo(() => {
    return posts.filter((post) => {
      if (category && post.category !== category) return false;
      if (search) {
        const haystack = `${post.titleEn} ${post.bodyEn ?? ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [posts, category, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={tCommon('search')}
          className="max-w-xs"
        />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={category === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setCategory(null);
                setPage(1);
              }}
            >
              {tCommon('all')}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
              >
                {translateFreeTextCategory(cat, locale)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {pageItems.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={posts.length === 0 ? t('noNews') : tCommon('noResults')}
        />
      ) : (
        (() => {
          // Feature the lead story only on the true default view (no search,
          // no category filter, first page) — featuring an arbitrary item on
          // a filtered/paginated view would misleadingly imply prominence it
          // doesn't have.
          const isDefaultView = page === 1 && !search && !category;
          const [lead, ...remaining] = pageItems;
          const gridItems = isDefaultView ? remaining : pageItems;
          return (
            <>
              {isDefaultView && <FeaturedNewsCard post={lead} locale={locale} />}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {gridItems.map((post) => (
                  <NewsCard key={post.id} post={post} locale={locale} />
                ))}
              </div>
            </>
          );
        })()
      )}

      <PaginationBar
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, totalPages }}
        onPageChange={setPage}
        labels={{
          showing: tCommon('showing'),
          of: tCommon('of'),
          page: tCommon('page'),
          previousPage: tCommon('previousPage'),
          nextPage: tCommon('nextPage'),
        }}
      />
      <p className="sr-only">{t('categories')}</p>
    </div>
  );
}
