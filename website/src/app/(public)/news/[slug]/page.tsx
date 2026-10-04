import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { PageHero } from '@/components/public/page-hero';
import { RichContent } from '@/components/public/rich-content';
import { ShareButtons } from '@/components/public/share-buttons';
import { PremiumButton } from '@/components/public/premium-button';
import { JsonLd } from '@/components/public/json-ld';
import { getPublicNewsPostBySlug, getSiteSettings } from '@/lib/public-api';
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { stripHtml } from '@/lib/strip-html';
import { env } from '@/lib/env';
import { newsPosts } from '@/content/news';

interface Props {
  params: Promise<{ slug: string }>;
}

// Required by `output: 'export'` — see activities/[slug]/page.tsx for why
// only `slug` needs to be returned here.
export function generateStaticParams() {
  return newsPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await getPublicNewsPostBySlug(slug);
  if (!post) return {};

  const settings = await getSiteSettings();
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  // `metaTitleEn`/`metaDescriptionEn` are admin-set SEO overrides with no
  // Telugu counterpart in the schema — only apply them for English, so a
  // Telugu page never surfaces an English-only meta override; Telugu falls
  // through to the already locale-aware title/body below instead.
  const bodySource = locale === 'te' && post.bodyTe ? post.bodyTe : post.bodyEn;
  const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;
  const description =
    (locale !== 'te' ? post.metaDescriptionEn : undefined) ??
    (bodySource ? stripHtml(bodySource) : undefined)?.slice(0, 160) ??
    tagline ??
    '';

  return buildMetadata({
    locale,
    path: `/news/${slug}`,
    title: (locale !== 'te' ? post.metaTitleEn : undefined) ?? `${title} — ${settings.siteNameEn}`,
    description,
    image: post.featuredImageUrl,
  });
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await getPublicNewsPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations('Nav');
  const tCommon = await getTranslations('Common');
  const tNews = await getTranslations('News');
  const title = locale === 'te' && post.titleTe ? post.titleTe : post.titleEn;
  const body = locale === 'te' && post.bodyTe ? post.bodyTe : post.bodyEn;
  const url = `${env.NEXT_PUBLIC_SITE_URL}/news/${slug}`;
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
          { name: t('news'), url: `${env.NEXT_PUBLIC_SITE_URL}/news` },
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
        <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-xl">
          <Image
            src={post.featuredImageUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover object-center"
          />
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
        <div className="pub-gradient-emerald mt-12 flex flex-col items-center gap-3 rounded-[var(--radius-pub-card)] p-8 text-center text-white">
          <p className="font-pub-heading text-lg font-semibold">{tNews('supportSevaHeading')}</p>
          <p className="max-w-sm text-sm leading-relaxed text-white/80">
            {tNews('supportSevaBody')}
          </p>
          <PremiumButton render={<Link href="/donate#online-donation" />} className="mt-2">
            {tCommon('donateNow')}
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
