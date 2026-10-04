import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'sysa_access_token';

/**
 * Presence-only `/admin/*` route guard — the actual authorization boundary
 * remains the backend API and the Admin layout's server-side check. This is
 * the only job of this middleware; the site has no locale routing to handle
 * (see i18n/request.ts — locale is fixed to 'en').
 */
export function middleware(request: NextRequest) {
  const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  if (!hasAccessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
