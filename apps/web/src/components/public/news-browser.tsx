'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Newspaper } from 'lucide-react';

import { NewsCard } from '@/components/public/news-card';
import { PaginationBar } from '@/components/admin/pagination-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { NewsPost } from '@/types/public';

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
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {pageItems.length === 0 ? (
        <EmptyState icon={Newspaper} title={tCommon('noResults')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((post) => (
            <NewsCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      )}

      <PaginationBar
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, totalPages }}
        onPageChange={setPage}
      />
      <p className="sr-only">{t('categories')}</p>
    </div>
  );
}
