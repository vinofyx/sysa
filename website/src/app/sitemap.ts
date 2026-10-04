import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { getPublicEvents, getPublicNewsPosts, getActivities } from '@/lib/public-api';

// Route segment config must be a literal ('force-dynamic' in standalone mode
// vs 'force-static' for export can't be expressed as a conditional — Next.js
// rejects non-literal `dynamic` exports at build time in both modes). This
// changes standalone/VPS mode's sitemap from per-request-fresh to
// cached-at-build — the one accepted behavior change needed to satisfy
// `output: 'export'`'s hard requirement for the Hostinger static build; see
// the final static-export report for the full rationale.
export const dynamic = 'force-static';

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
  return {
    url: `${siteUrl}${normalized}`,
    lastModified: new Date(),
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
