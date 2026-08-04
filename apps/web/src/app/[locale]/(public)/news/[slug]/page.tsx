import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { ShareButtons } from '@/components/public/share-buttons';
import { JsonLd } from '@/components/public/json-ld';
import { getPublicNewsPostBySlug, getSiteSettings } from '@/lib/public-api';
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { env } from '@/lib/env';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublicNewsPostBySlug(slug);
  if (!post) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const description =
    post.metaDescriptionEn ??
    post.bodyEn?.replace(/<[^>]+>/g, '').slice(0, 160) ??
    settings.taglineEn ??
    '';

  return buildMetadata({
    locale,
    path: `/news/${slug}`,
    title: post.metaTitleEn ?? `${title} — ${settings.siteNameEn}`,
    description,
    image: post.featuredImageUrl,
  });
}

export default async function NewsDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getPublicNewsPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations('Nav');
  const tNews = await getTranslations('News');
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const body = locale === 'te' && post.bodyTe ? post.bodyTe : post.bodyEn;
  const url = `${env.NEXT_PUBLIC_SITE_URL}/${locale}/news/${slug}`;
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(locale === 'te' ? 'te-IN' : 'en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div>
      <JsonLd
        data={articleJsonLd({
          titleEn: post.titleEn,
          bodyEn: post.bodyEn,
          publishedAt: post.publishedAt,
          featuredImageUrl: post.featuredImageUrl,
          url,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('home'), url: env.NEXT_PUBLIC_SITE_URL },
          { name: t('news'), url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/news` },
          { name: title, url },
        ])}
      />
      <PageHero
        title={title}
        breadcrumb={[
          { label: t('home'), href: '/' },
          { label: t('news'), href: '/news' },
          { label: title },
        ]}
      />
      {post.featuredImageUrl && (
        <div className="relative mx-auto h-64 max-w-4xl overflow-hidden rounded-xl sm:h-96">
          <Image src={post.featuredImageUrl} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {date && (
            <p className="text-pub-neutral-500 text-sm">{`${tNews('publishedOn')} ${date}`}</p>
          )}
          <ShareButtons url={url} title={title} />
        </div>
        <RichContent html={body ?? ''} />
        {post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
