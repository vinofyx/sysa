import type { Metadata } from 'next';

import { env } from '@/lib/env';
import type { SiteSettings } from '@/types/public';

interface BuildMetadataParams {
  locale: string;
  /** Path WITHOUT the locale prefix, e.g. `/about` or `/` for the homepage. */
  path: string;
  title: string;
  description: string;
  image?: string | null;
  noIndex?: boolean;
}

/** Builds a Next.js `Metadata` object with the canonical/hreflang/OG/Twitter
 * fields every public page needs (design/11-SEO-Structure.md). */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  noIndex,
}: BuildMetadataParams): Metadata {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || 'https://sysa.in';
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;

  const canonical = `${siteUrl}${normalizedPath}`;
  const ogUrl = path === '/' ? `${siteUrl}/` : canonical;

  const defaultSharingImage = `${siteUrl}/whatsapp-preview-v3.jpg`;
  const resolvedImageUrl = image
    ? image.startsWith('http')
      ? image
      : `${siteUrl}${image.startsWith('/') ? '' : '/'}${image}`
    : defaultSharingImage;

  const resolvedTitle = title || 'Sai Yadadri Seva Ashram';
  const resolvedDescription =
    description || 'Maanava Sevaaye Madhava Seva – Service to Humanity is Service to God.';

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    icons: {
      icon: [
        { url: '/favicon-v2.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
        { url: '/icon-v2.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: [{ url: '/apple-touch-icon-v2.png', sizes: '180x180', type: 'image/png' }],
      shortcut: '/favicon-v2.ico',
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: ogUrl,
      siteName: 'Sai Yadadri Seva Ashram',
      locale,
      type: 'website',
      images: [
        {
          url: resolvedImageUrl,
          secureUrl: resolvedImageUrl,
          type: 'image/jpeg',
          width: 1200,
          height: 630,
          alt: 'Sai Yadadri Seva Ashram official banner',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: [resolvedImageUrl],
    },
  };
}

/** `defaultMetaTitle`/`defaultMetaDescription` are single admin-set SEO
 * overrides with no Telugu counterpart in the schema (unlike `taglineEn`/
 * `taglineTe`) — showing them on a /te/ page would silently put English text
 * in the page's <title>/<meta description>. Skip them entirely for Telugu
 * and fall through to the locale-aware tagline/site name instead. Every
 * public page's `generateMetadata` repeats this same fallback chain, so it's
 * centralized here rather than re-implemented at each of the ~16 call sites. */
export function localizedDefaultDescription(settings: SiteSettings, locale: string): string {
  const tagline = locale === 'te' && settings.taglineTe ? settings.taglineTe : settings.taglineEn;
  const siteName =
    locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;
  const override = locale === 'te' ? null : settings.defaultMetaDescription;
  return (
    override ??
    tagline ??
    siteName ??
    'Maanava Sevaaye Madhava Seva – Service to Humanity is Service to God.'
  );
}

/** Falls back to `SiteSettings.defaultMetaTitle/Description` when a page has
 * no editorial override — never a hardcoded generic string. */
export function defaultSeoFields(settings: SiteSettings, locale: string) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || 'https://sysa.in';
  const siteName =
    locale === 'te' && settings.siteNameTe ? settings.siteNameTe : settings.siteNameEn;
  return {
    title:
      (locale === 'te' ? null : settings.defaultMetaTitle) ?? siteName ?? 'Sai Yadadri Seva Ashram',
    description: localizedDefaultDescription(settings, locale),
    image: settings.defaultOgImageUrl || `${siteUrl}/whatsapp-preview-v3.jpg`,
  };
}

export function ngoJsonLd(settings: SiteSettings, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: settings.siteNameEn,
    url: siteUrl,
    logo: settings.logoUrl ?? undefined,
    foundingDate: '2019-05-14',
    address: settings.contactAddressEn
      ? { '@type': 'PostalAddress', streetAddress: settings.contactAddressEn }
      : undefined,
    email: settings.contactEmail ?? undefined,
    telephone: settings.contactPhone ?? undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function eventJsonLd(event: {
  titleEn: string;
  descriptionEn: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  featuredImageUrl: string | null;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.titleEn,
    description: event.descriptionEn ?? undefined,
    startDate: event.startDate,
    endDate: event.endDate ?? undefined,
    location: event.location ? { '@type': 'Place', name: event.location } : undefined,
    image: event.featuredImageUrl ?? undefined,
    url: event.url,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  };
}

export function articleJsonLd(post: {
  titleEn: string;
  bodyEn: string | null;
  publishedAt: string | null;
  featuredImageUrl: string | null;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.titleEn,
    description: post.bodyEn ? post.bodyEn.replace(/<[^>]+>/g, '').slice(0, 200) : undefined,
    datePublished: post.publishedAt ?? undefined,
    image: post.featuredImageUrl ?? undefined,
    url: post.url,
  };
}
