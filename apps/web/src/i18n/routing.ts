import { defineRouting } from 'next-intl/routing';

/**
 * Bilingual public-site routing (design/11-SEO-Structure.md: every page emits
 * hreflang en/te/x-default, each locale self-canonical). `localePrefix: 'always'`
 * matches the wireframes (`design/05-Wireframes.md`), which show `/en/...` for
 * every page including the homepage, not just the non-default locale.
 *
 * Scope: only the public site is localized — the admin CMS and auth flows
 * (Phase 4/5) stay English-only and outside this routing entirely (see
 * middleware.ts, which never invokes next-intl for `/admin` or auth paths).
 */
export const routing = defineRouting({
  locales: ['en', 'te'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
