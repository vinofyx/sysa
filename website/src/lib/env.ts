import { z } from 'zod';

/**
 * Client-side environment schema — validates the `NEXT_PUBLIC_*` variables the
 * browser bundle actually needs. Mirrors the fail-fast pattern used on the API
 * (api/src/config/env.ts) so a missing/malformed value is caught at build
 * time rather than surfacing as a confusing runtime error deep in a component.
 */
const clientEnvSchema = z.object({
  // No `.default(...)` here on purpose: a literal fallback string is a
  // compile-time constant, so Next.js bundles it into the client JS even
  // though it's dead code once a real env value is present — which made
  // scripts/build-static.mjs's loopback-URL guard flag every production
  // build as if `NEXT_PUBLIC_API_URL` were still pointing at localhost. Both
  // vars are already supplied via `.env.local` (dev) or the build command
  // (static export), so requiring them outright is strictly fail-faster.
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

function resolveClientEnv() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // `next dev` inherits leftover production URLs from a prior static build in
  // the same shell (process.env beats .env.local). Those hosts currently have
  // no Node API, so PublicLayout's getNavigation/getSiteSettings 404 and the
  // whole public site crashes. Keep local dev on the machine's API/site.
  const usingProductionHost = (value: string | undefined) =>
    Boolean(value && /(?:sysa\.in|onrender\.com)/i.test(value));

  return {
    NEXT_PUBLIC_API_URL:
      process.env.NODE_ENV !== 'production' && usingProductionHost(apiUrl)
        ? 'http://localhost:5050'
        : apiUrl,
    NEXT_PUBLIC_SITE_URL:
      process.env.NODE_ENV !== 'production' && usingProductionHost(siteUrl)
        ? 'http://localhost:3030'
        : siteUrl,
  };
}

function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse(resolveClientEnv());

  if (!parsed.success) {
    console.error('❌ Invalid client environment configuration:', parsed.error.flatten());
    throw new Error('Invalid client environment configuration');
  }

  return parsed.data;
}

export const env = validateClientEnv();
