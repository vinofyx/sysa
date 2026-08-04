import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

const ACCESS_TOKEN_COOKIE = 'sysa_access_token';

/** Paths that stay English-only and outside locale routing entirely — the
 * admin CMS (Phase 4/5) and its auth flows were built before Phase 6's
 * localization work and are deliberately left untouched. */
const NON_LOCALIZED_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unauthorized',
];

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Combines two independent concerns in one middleware (Next.js only runs one
 * middleware file per request):
 *
 * 1. The pre-existing presence-only `/admin/*` route guard (unchanged from
 *    Phase 4 — see the doc-comment below) — the actual authorization boundary
 *    remains the backend API and the Admin layout's server-side check.
 * 2. next-intl's locale-detection/redirect middleware for every other path
 *    (the public site, Phase 6), which rewrites/redirects `/`, `/about`, etc.
 *    into `/en/...` or `/te/...`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
    if (!hasAccessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (NON_LOCALIZED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Runs on every path except Next.js internals, API routes (this app has
  // none — the backend is a separate origin), and files with an extension
  // (static assets, sitemap.xml, robots.txt).
  matcher: ['/((?!_next|.*\\..*).*)'],
};
