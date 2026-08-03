import type { Response } from 'express';
import ms from 'ms';

import { env } from '@config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@config/constants';

/** Parses a duration string like "15m" or "7d" into milliseconds. */
function toMilliseconds(value: string): number {
  return ms(value as Parameters<typeof ms>[0]) as number;
}

/**
 * Auth cookie helpers — httpOnly, `secure` in production, `sameSite=lax` (the
 * admin dashboard and API are first-party/same-site in the deployed topology
 * per design/15-Deployment-Architecture.md, so `lax` is sufficient and avoids
 * the cross-site friction of `strict` on top-level navigations like email links).
 */
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
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
