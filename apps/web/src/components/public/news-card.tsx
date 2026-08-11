'use client';

import Image from 'next/image';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/public/motion';
import type { NewsPost } from '@/types/public';

export function NewsCard({
  post,
  locale,
  index = 0,
}: {
  post: NewsPost;
  locale: string;
  index?: number;
}) {
  const t = useTranslations('Common');
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Reveal delay={index * 0.08} className="h-full">
      <Link
        href={`/news/${post.slug}`}
        className="border-pub-neutral-200/70 shadow-pub-md hover:shadow-pub-xl group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-pub-card)] border bg-white transition-all duration-500 hover:-translate-y-2"
      >
        <div className="bg-pub-primary-100 relative aspect-[16/10] overflow-hidden">
          {post.featuredImageUrl ? (
            <Image
              src={post.featuredImageUrl}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="pub-gradient-emerald flex size-full items-center justify-center">
              <Newspaper className="text-pub-gold-300 size-12" strokeWidth={1.5} />
            </div>
          )}
          <div className="from-pub-primary-950/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-6">
          {date && (
            <p className="text-pub-gold-700 text-xs font-semibold tracking-wide uppercase">
              {date}
            </p>
          )}
          <h3 className="font-pub-heading text-pub-primary-950 line-clamp-2 text-lg font-semibold">
            {title}
          </h3>
          <span className="text-pub-gold-700 group-hover:text-pub-gold-500 mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold transition-colors">
            {t('readMore')}
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
