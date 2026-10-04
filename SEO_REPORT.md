# SEO Report

## Sai Yadadri Seva Ashram Platform — Final Phase: Production Readiness

|            |                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| **Scope**  | Meta Tags, Open Graph, Twitter Cards, Canonical URLs, robots.txt, sitemap.xml, Structured Data       |
| **Date**   | 2026-08-04                                                                                           |
| **Method** | Per-page `generateMetadata` coverage check, direct review of `lib/seo.ts`, `sitemap.ts`, `robots.ts` |

---

## 1. Meta Tags / Open Graph / Twitter Cards Coverage

Every public page's metadata is built through one shared function, `buildMetadata()` (`website/src/lib/seo.ts`), which always sets: `title`, `description`, canonical `alternates` (see §3), `robots` (index/noindex), and both `openGraph` (title, description, url, siteName, locale, type, conditional image) and `twitter` (`summary_large_image` card when an image is available, `summary` otherwise) blocks. Using one shared builder means every page gets the full, correct set of tags by construction — there's no per-page copy-paste drift.

Checked all 30 public page files for `generateMetadata` presence:

| Result                        |  Count  | Detail                                                                                                                                               |
| ----------------------------- | :-----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Has `generateMetadata`        |   29    | —                                                                                                                                                    |
| Missing, and legitimately N/A |    1    | `/services` — a pure server-side redirect to `/activities` that never renders content, so metadata is moot (the browser never sees this page's HTML) |
| **Missing, real gap**         | ~~1~~ 0 | `/donate/history` **was** missing this — see Finding below                                                                                           |

### Finding (fixed): `/donate/history` had no page-specific metadata

The page was built as a single fully-client-rendered component (`'use client'`), which is why it never had `generateMetadata` — Next.js metadata generation only works in Server Components. This meant the page always showed the site-wide default title/description instead of "Donation History" — both a minor SEO miss (search engines and social shares would show a generic title) and a UX rough edge (the browser tab title never changed when navigating there).

**Fixed**: split the page into a Server Component shell (`app/[locale]/(public)/donate/history/page.tsx`, now exports `generateMetadata`, `noIndex: true` since this is an account-scoped page that shouldn't be indexed) and a Client Component for the interactive OTP-login/donation-list body (`components/public/donation-history-view.tsx`). Verified live: the page title now correctly reads "Donation History" instead of the site default.

---

## 2. Structured Data (JSON-LD)

| Schema type          | Where used                                 |                                                Correct placement?                                                 |
| -------------------- | ------------------------------------------ | :---------------------------------------------------------------------------------------------------------------: |
| `NGO` (Organization) | Homepage only                              | ✅ — Google's own guidance is to place site-wide Organization schema once, on the homepage, not repeated per-page |
| `BreadcrumbList`     | Activity detail, Event detail, News detail |                                      ✅ — appropriate for deep/detail pages                                       |
| `Event`              | Event detail pages                         |                                                        ✅                                                         |
| `Article`            | News detail pages                          |                                                        ✅                                                         |

All rendered through one shared `<JsonLd data={...}>` component and typed builder functions (`ngoJsonLd`, `breadcrumbJsonLd`, `eventJsonLd`, `articleJsonLd` in `lib/seo.ts`) — no hand-rolled inline `<script type="application/ld+json">` blocks that could drift from the shared schema shape.

**Not a defect, but a recommendation for a future enhancement**: `BreadcrumbList` schema could be extended to more interior pages (Activities list, Events list, News list, About sub-pages) beyond just the detail pages. Not required — Google's rich-result eligibility for breadcrumbs is primarily about detail/deep pages, which are already covered — but would be a reasonable low-effort addition in a future content-focused phase.

---

## 3. Canonical URLs & Hreflang

`buildMetadata()` sets `alternates.canonical` (locale-qualified, e.g. `https://sysaindia.org/en/donate`) and `alternates.languages` (one entry per locale, `en`/`te`, plus an `x-default` fallback to the default locale) on **every** page that calls it. This correctly tells search engines that `/en/donate` and `/te/donate` are the same content in two languages, not duplicate content.

No gaps found.

---

## 4. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /login
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /unauthorized
Sitemap: https://<site>/sitemap.xml
```

Correctly excludes every non-public surface (admin CMS, auth flows) from crawling/indexing while allowing everything else. Dynamically generated from `NEXT_PUBLIC_SITE_URL`, so the sitemap reference is always correct for whatever environment it's deployed to.

No gaps found.

---

## 5. sitemap.xml

Dynamically generated (`app/sitemap.ts`), regenerated per-request (deliberate — no build-time content-publish webhook exists in this environment to trigger regeneration otherwise, so per-request generation is the freshness-correct choice given that constraint).

- **Static paths**: all 20 evergreen public routes (Home, About + 6 sub-pages, Activities, Services, Volunteer, Events, News, Gallery, Testimonials, Donate, Contact, 4 legal pages).
- **Dynamic paths**: every published event, news post, and activity slug, fetched live from the CMS APIs (`getPublicEvents`, `getPublicNewsPosts`, `getActivities`), each wrapped in `.catch(() => [])` so a backend outage degrades to a smaller sitemap rather than failing sitemap generation entirely.
- Every entry includes `alternates.languages` for both locales.

No gaps found.

---

## 6. Root-Level Metadata Correctness

### Finding (fixed): no `metadataBase` set

Next.js recommends (and warns at build/dev time if absent) setting `metadataBase` in the root layout so relative URLs in metadata resolve against the real site origin. Every image URL currently used in this app's metadata is already a fully-qualified Cloudinary URL, so this wasn't causing a _visibly broken_ image — but it was: (a) emitting a Next.js console warning on every build, and (b) leaving a latent trap for any future page that adds a relative metadata URL, which would have silently resolved against `localhost` in production.

**Fixed**: added `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')` to the root layout's `metadata` export.

---

## 7. Summary of Changes Made This Phase

| #   | Change                                                                                    | File(s)                                                                                        |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Added `generateMetadata` to the Donation History page (via server/client component split) | `app/[locale]/(public)/donate/history/page.tsx`, `components/public/donation-history-view.tsx` |
| 2   | Added `metadataBase` to the root layout                                                   | `website/src/app/layout.tsx`                                                                   |

## 8. Recommendations for Future Phases (Not Blocking)

- Extend `BreadcrumbList` structured data to interior list pages, not just detail pages.
- Once real content exists (Phase 8 — Content Population), verify actual rendered titles/descriptions/OG images against Google's Rich Results Test and the Facebook/Twitter card debuggers — this requires real, published CMS content and cannot be meaningfully done against this environment's placeholder-free-but-empty database.
