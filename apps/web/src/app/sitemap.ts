import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { routing } from '@/i18n/routing';
import { getPublicEvents, getPublicNewsPosts, getActivities } from '@/lib/public-api';

const STATIC_PATHS = [
  '/',
  '/about',
  '/about/history',
  '/about/vision',
  '/about/mission',
  '/about/founder',
  '/about/committee',
  '/about/treasurer',
  '/activities',
  '/services',
  '/volunteer',
  '/events',
  '/news',
  '/gallery',
  '/testimonials',
  '/donate',
  '/contact',
  '/privacy-policy',
  '/terms-conditions',
  '/refund-policy',
  '/disclaimer',
];

function entry(path: string, siteUrl: string): MetadataRoute.Sitemap[number] {
  const normalized = path === '/' ? '' : path;
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${siteUrl}/${locale}${normalized}`;
  }
  return {
    url: `${siteUrl}/${routing.defaultLocale}${normalized}`,
    lastModified: new Date(),
    alternates: { languages },
  };
}

/** Dynamic `sitemap.xml` — regenerated per request (design/11-SEO-Structure.md
 * calls for regeneration on publish; since there's no build-time webhook in
 * this environment, per-request generation achieves the same freshness). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;

  const [events, posts, activities] = await Promise.all([
    getPublicEvents().catch(() => []),
    getPublicNewsPosts().catch(() => []),
    getActivities().catch(() => []),
  ]);

  const dynamicPaths = [
    ...events.map((event) => `/events/${event.slug}`),
    ...posts.map((post) => `/news/${post.slug}`),
    ...activities.map((activity) => `/activities/${activity.slug}`),
  ];

  return [...STATIC_PATHS, ...dynamicPaths].map((path) => entry(path, siteUrl));
}
