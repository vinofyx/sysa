import 'server-only';

import { cookies } from 'next/headers';

import { env } from '@/lib/env';
import type { AuthUser } from '@/types/auth';

/**
 * Server-side identity check for Server Components (the Admin layout, primarily).
 *
 * Forwards the incoming request's cookies to the backend's `/auth/me` so the
 * backend remains the single source of truth for "who is this and what can they
 * do" — the frontend never independently verifies the JWT or re-derives
 * permissions, per design/13-API-Architecture.md's layering (and avoids needing
 * the JWT signing secret in two codebases). See middleware.ts for the
 * lightweight, cookie-presence-only edge check used for the initial redirect.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}
