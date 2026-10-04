import type { Response } from 'express';
import ms from 'ms';

import { env } from '@config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, DONOR_TOKEN_COOKIE } from '@config/constants';

/** Parses a duration string like "15m" or "7d" into milliseconds. */
function toMilliseconds(value: string): number {
  return ms(value as Parameters<typeof ms>[0]) as number;
}

/**
 * Auth cookie helpers — httpOnly, `secure` in production, `sameSite=lax` by
 * default (the admin dashboard and API are first-party/same-site in the
 * primary deployed topology per design/15-Deployment-Architecture.md, so
 * `lax` is sufficient and avoids the cross-site friction of `strict` on
 * top-level navigations like email links). When the API is deployed on a
 * different site than the frontend (`COOKIE_CROSS_SITE=true`), browsers
 * require `SameSite=None; Secure` instead — `lax`/unsecured cookies are
 * simply not sent on cross-site requests at all, regardless of CORS.
 */
function baseCookieOptions() {
  const crossSite = env.COOKIE_CROSS_SITE;
  return {
    httpOnly: true,
    secure: crossSite ? true : env.NODE_ENV === 'production',
    sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/',
  };
}

export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: toMilliseconds(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: toMilliseconds(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
}

const DONOR_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches DONOR_TOKEN_TTL in lib/donor-jwt.ts

export function setDonorTokenCookie(res: Response, token: string): void {
  res.cookie(DONOR_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: DONOR_TOKEN_MAX_AGE_MS,
  });
}

export function clearDonorTokenCookie(res: Response): void {
  res.clearCookie(DONOR_TOKEN_COOKIE, baseCookieOptions());
}
