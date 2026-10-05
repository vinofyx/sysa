import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

// Route segment config must be a literal for Next.js's static analysis (a
// conditional expression here fails the build in both modes). Harmless in
// standalone mode too — this route has no per-request data to begin with.
// Required by `output: 'export'` (the Hostinger static build).
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/unauthorized',
        ],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
