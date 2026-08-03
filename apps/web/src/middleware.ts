import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'sysa_access_token';

/**
 * Lightweight, presence-only route guard for `/admin/*`.
 *
 * This checks only whether the access-token cookie exists — it does NOT verify
 * the JWT signature or look up the session, because doing that correctly would
 * require either duplicating the JWT secret into this codebase (edge runtime)
 * or an extra network round-trip per request. The actual authorization
 * boundary is the backend API, which re-verifies the token and the underlying
 * session on every request (see apps/api/src/middleware/authenticate.middleware.ts)
 * and the Admin layout's server-side `getServerUser()` check (lib/server-auth.ts),
 * which calls that same backend endpoint. This middleware exists purely so an
 * unauthenticated visitor is redirected instantly, without waiting for a
 * server-rendered layout to reject them.
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
