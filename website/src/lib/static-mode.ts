/**
 * Single build-time switch for the Hostinger static-export build
 * (`STATIC_EXPORT=true npm run build:static`, see next.config.ts and
 * package.json). Deliberately `NEXT_PUBLIC_`-prefixed so the same flag is
 * readable both in Server Components (build-time data source selection in
 * lib/public-api.ts) and in Client Components (hiding UI that depends on a
 * backend that won't be reachable from static hosting, e.g. the donation
 * checkout form). Next.js inlines `NEXT_PUBLIC_*` at build time either way,
 * which matches static export's "baked once at build" model exactly.
 */
export const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
