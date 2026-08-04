import Image from 'next/image';
import { Newspaper } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { NewsPost } from '@/types/public';

export function NewsCard({ post, locale }: { post: NewsPost; locale: string }) {
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/news/${post.slug}`}
      className="border-pub-neutral-200 shadow-pub-sm hover:shadow-pub-md group flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow"
    >
      <div className="bg-pub-primary-100 relative aspect-[16/9]">
        {post.featuredImageUrl ? (
          <Image
            src={post.featuredImageUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Newspaper className="text-pub-primary-700 size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {date && <p className="text-pub-neutral-500 text-xs">{date}</p>}
        <h3 className="font-pub-heading text-pub-primary-900 line-clamp-2 text-base font-semibold">
          {title}
        </h3>
      </div>
    </Link>
  );
}
