'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Images } from 'lucide-react';

import { GalleryGrid } from '@/components/public/gallery-lightbox';
import { SearchInput } from '@/components/admin/search-input';
import { EmptyState } from '@/components/admin/empty-state';
import { Badge } from '@/components/ui/badge';
import type { GalleryAlbum, GalleryItem } from '@/types/public';

type ItemWithMeta = GalleryItem & { albumName: string; category: string | null };

export function GalleryBrowser({ albums, locale }: { albums: GalleryAlbum[]; locale: string }) {
  const t = useTranslations('Gallery');
  const tCommon = useTranslations('Common');
  const [category, setCategory] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  const categories = React.useMemo(
    () =>
      Array.from(new Set(albums.map((album) => album.category).filter((c): c is string => !!c))),
    [albums],
  );

  const allItems: ItemWithMeta[] = React.useMemo(
    () =>
      albums.flatMap((album) =>
        album.items.map((item) => ({ ...item, albumName: album.nameEn, category: album.category })),
      ),
    [albums],
  );

  const filtered = allItems.filter((item) => {
    if (category && item.category !== category) return false;
    if (search && !item.albumName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchPlaceholder')}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={category === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setCategory(null)}
          >
            {tCommon('all')}
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Images} title={tCommon('noResults')} />
      ) : (
        <GalleryGrid items={filtered} locale={locale} />
      )}
    </div>
  );
}
