# Performance Report

## Sai Yadadri Seva Ashram Platform — Final Phase: Production Readiness

|            |                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **Scope**  | Caching, Lazy Loading, Image Optimization, Bundle Size, Code Splitting, Database Queries, Indexes, API Response Times |
| **Date**   | 2026-08-04                                                                                                            |
| **Method** | Prisma schema review, production build output analysis, source review for query/render patterns                       |

---

## 1. Database Indexes

Reviewed every model in `apps/api/prisma/schema.prisma`: **41 explicit `@@index` declarations**, plus implicit indexes from every `@unique`/`@id` constraint (Postgres/Prisma create these automatically).

Coverage confirmed for every common access pattern actually used by the application:

| Pattern                     | Example                                                                                                                     |               Indexed?                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | :-----------------------------------: |
| Foreign key lookups         | `Donation.categoryId`, `Donation.donorId`                                                                                   |                  ✅                   |
| Status/date filtering       | `Donation` on `[status, createdAt]`, `Event` on `[status, startDate]`                                                       |            ✅ (composite)             |
| Soft-delete filtering       | `deletedAt` on every soft-deletable model (Activity, CommitteeMember, Testimonial, GalleryAlbum, etc.)                      |                  ✅                   |
| Unique lookups              | `AdminUser.email`, `Donor.email`                                                                                            |        ✅ (unique constraint)         |
| Session/token expiry sweeps | `Session.expiresAt`, `PasswordResetToken.expiresAt`, `EmailVerificationToken.expiresAt`, `DonorOtp.[donorEmail, expiresAt]` |                  ✅                   |
| Audit log queries           | `[adminUserId, timestamp]`, `[entityType, entityId]`                                                                        |            ✅ (composite)             |
| Payment gateway lookups     | `Donation.paymentGatewayRef`, `Donation.razorpayOrderId`, `Donation.idempotencyKey`                                         | ✅ (unique constraint, added Phase 7) |
| Webhook idempotency         | `PaymentWebhookEvent.eventId`                                                                                               |        ✅ (unique constraint)         |

**No missing index was found** for any query pattern actually present in the codebase. No changes made.

---

## 2. Database Query Patterns (N+1 check)

Reviewed the higher-traffic/higher-complexity query paths for N+1 patterns (a loop issuing one query per row instead of one query with the right `include`/`join`):

- **Donation list/detail** (`donation.repository.ts`): single query with `include: { donor, category, appeal, receipt }` — no per-row follow-up queries.
- **Donation analytics** (`getAnalytics()`): 4 queries total (aggregate, 2× groupBy, 1× raw SQL), all fixed-count regardless of dataset size — not N+1.
- **Receipt issuance** (`receipt.service.ts`): a single `findByDonationIdWithDonation()` with a nested `include` fetches donation+donor+category in one round trip before generating the PDF.
- **Admin CMS list pages** (the 7 `buildSimpleCrudRouter`-based modules): single paginated `findMany` + `count`, no relation loading beyond what's needed for the list view.
- **Sitemap generation** (`app/sitemap.ts`): 3 parallel (`Promise.all`) list fetches, not sequential, not per-item.

**No N+1 pattern found.** No changes made.

---

## 3. Image Optimization

### Finding (fixed): `unoptimized` disabled on 15 `<Image>` usages

Every image URL in this application is either a Cloudinary URL (uploads) or absent (conditional rendering) — `res.cloudinary.com` has been in `next.config.ts`'s `images.remotePatterns` since Phase 6. Despite that, 15 separate `<Image>` usages across the public site and admin panel had `unoptimized` set, which **disables Next.js's built-in image pipeline entirely** for that image: no responsive `srcset` generation, no on-demand resizing to the actual rendered dimensions, no automatic AVIF/WebP negotiation based on the requesting browser.

This wasn't providing any safety benefit — the domain was already trusted and whitelisted — so it was a pure performance regression with no offsetting benefit.

**Fixed**: removed `unoptimized` from all 15 usages (hero banner, activity/event/news cards, testimonial avatars, committee photos, site logo, gallery grid + lightbox, admin thumbnails, UPI QR image, image-upload-field preview). Verified each one's `src` is always either a Cloudinary URL or conditionally not rendered at all (never a local `blob:`/`data:` URL that would have needed `unoptimized`).

Files touched: `hero-banner.tsx`, `activity-card.tsx`, `event-card.tsx`, `news-card.tsx`, `testimonial-carousel.tsx`, `site-header.tsx`, `gallery-lightbox.tsx` (×2), `donate/page.tsx`, `about/committee/page.tsx`, `events/[slug]/page.tsx`, `news/[slug]/page.tsx`, `testimonials/page.tsx`, admin `hero-banners/page.tsx`, admin `gallery/[albumId]/page.tsx`, `image-upload-field.tsx`.

### Other image findings

- No raw `<img>` tags found anywhere in the codebase — 100% of image rendering goes through `next/image`.
- `gallery-lightbox.tsx`'s grid thumbnails correctly use `loading="lazy"`.
- The homepage hero banner correctly uses `priority` (above-the-fold, should NOT lazy-load) — confirmed this is the only `priority` usage in the codebase, appropriately scoped.

---

## 4. Lazy Loading & Code Splitting

- Next.js App Router provides automatic per-route code splitting — confirmed from the production build output: every route has its own JS chunk size reported independently (e.g. the donation checkout form's Razorpay-loading logic is not bundled into pages that don't render it).
- Third-party scripts: Razorpay's `checkout.js` is loaded dynamically at runtime via a dedicated `useRazorpayScript()` hook (injects a `<script>` tag on mount) rather than being bundled or loaded eagerly on every page — it only loads on pages that actually render the checkout/retry components.
- Gallery lightbox images lazy-load (`loading="lazy"`, confirmed above).
- No further lazy-loading gaps identified.

---

## 5. Bundle Size

From `npm run build --workspace=apps/web` production output:

| Metric                           | Value                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Shared JS (every page pays this) | 103 kB                                                                                          |
| Smallest public page             | ~119 kB First Load JS (e.g. legal pages)                                                        |
| Largest public page              | ~248 kB First Load JS (`/donate` — includes the Razorpay checkout form + react-hook-form + Zod) |
| Largest admin page               | ~287 kB First Load JS (`/admin/reports` — includes Recharts)                                    |
| Middleware                       | 45.9 kB                                                                                         |

These are within normal bounds for a Next.js App Router application of this feature scope (bilingual, rich admin dashboard with charts, integrated payment checkout). The two largest pages (`/donate`, `/admin/reports`) are large specifically because they load real, necessary functionality (payment SDK, charting library) — not bloat. No action taken; flagged here as a baseline for future regression tracking rather than a problem to fix.

---

## 6. Caching

- Public pages use `export const dynamic = 'force-dynamic'` on the shared `(public)/layout.tsx` — a **deliberate** choice (documented since Phase 6): content is CMS-driven, and an admin publishing a change must be reflected on the next request, not after a stale-cache window. This trades some cacheability for correctness/freshness.
- `sitemap.ts`/`robots.ts` regenerate per-request for the same freshness reason (no build-time webhook exists in this environment to trigger regeneration on publish).
- No HTTP caching headers (`Cache-Control`) are currently set on public API responses — acceptable given the `force-dynamic` design (nothing is meant to be cached at this layer), but static assets (`_next/static/*`) get Next.js's default long-lived immutable caching automatically (unaffected by the dynamic rendering choice, since they're content-hashed).

**Recommendation for a follow-up** (not implemented this phase — would require a live backend + cache-invalidation webhook to test safely): once a live deployment exists, consider `revalidateTag`/on-demand ISR for the public pages that change infrequently (About, legal pages), keeping `force-dynamic` only where content genuinely needs per-request freshness (Home, Donate, Events).

---

## 7. API Response Times

Not benchmarked with load-testing tooling in this environment (no live database to generate realistic query latency against). Structural review found:

- Every list endpoint paginates (default page size 20, max 100) — no unbounded `findMany()` calls that could return an unbounded result set.
- The one aggregation-heavy endpoint (`donations/analytics`) uses SQL-side aggregation (`groupBy`, `$queryRaw` for the monthly rollup) rather than pulling every row into Node and aggregating in application code.
- Compression (`compression` middleware) is enabled on every response.

**Recommendation for a follow-up**: once deployed against a live database with real data volume, run a baseline load test (e.g. `autocannon` or `k6`) against the top 5 traffic-weighted endpoints (`/donation-categories/public`, `/events/public`, `/news/public`, `/donations/initiate`, `/donations/verify`) to establish real p50/p95 latency numbers — GO_LIVE_CHECKLIST.md includes this as a pre-launch action item.

---

## 8. Summary of Changes Made This Phase

| #   | Change                                         | Impact                                                                                             |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Removed `unoptimized` from 15 `<Image>` usages | Restores responsive resizing + AVIF/WebP negotiation for every Cloudinary-hosted image on the site |

No other performance issues were found requiring code changes — indexes, query patterns, code splitting, and lazy loading were all already solid.
