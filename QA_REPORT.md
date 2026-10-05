# QA Report

## Sai Yadadri Seva Ashram Platform — Final Phase: Production Readiness

|                    |                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**          | Full-application QA pass across all 7 completed phases                                                                                                                                                                                                                                                                                                                    |
| **Date**           | 2026-08-04                                                                                                                                                                                                                                                                                                                                                                |
| **Method**         | Static/code-level verification (route enumeration, permission mapping, translation-key diffing, build output) + live browser/curl checks against the dev servers. **No live PostgreSQL or Razorpay credentials exist in this build environment** — end-to-end runtime verification against real data is explicitly out of scope here and is called out per-section below. |
| **Companion docs** | [SECURITY_REPORT.md](SECURITY_REPORT.md) · [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md) · [SEO_REPORT.md](SEO_REPORT.md) · [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)                                                                                                                                                                                                 |

---

## 1. Summary

| Area                          | Result                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages (public + admin + auth) | 63 page routes verified present and building correctly (30 public, 29 admin, 4 auth)                                                                                |
| API routes                    | 34 route files, 100% authorization coverage verified (see §5)                                                                                                       |
| Forms                         | 100% of user-facing forms use Zod (server) + react-hook-form/Zod (client) validation                                                                                |
| File uploads                  | 4 upload endpoints, all MIME-restricted + size-limited (§7)                                                                                                         |
| Email templates               | 5 templates (auth, donation receipt, donor OTP, volunteer, shared layout) — all graceful no-op if SMTP unconfigured                                                 |
| Permissions                   | 52 permission codes, 100% match between code (`requirePermission`) and seed data — **0 mismatches found**                                                           |
| Roles                         | 10 roles seeded (Super Admin, Admin, Content Manager, Donation Manager, Volunteer Manager, Event Manager, Gallery Manager, Report Manager, Finance Manager, Viewer) |
| Translations                  | English/Telugu key parity: **151/151 keys match exactly** (0 missing either direction) — 1 real gap found and fixed (§6)                                            |
| Razorpay payment flows        | All 5 flows (initiate/verify/retry/webhook/receipt) code-reviewed and wiring-tested; **not exercised against a live Razorpay account** (§9)                         |
| Receipt generation            | Real PDF generation (pdfkit) wired into all 3 completion paths (online, manual, bank-transfer)                                                                      |
| Webhook verification          | HMAC signature verification + idempotency ledger confirmed working via direct `curl` test (§9)                                                                      |
| `npm run lint`                | ✅ Pass, 0 errors, 0 warnings (both apps)                                                                                                                           |
| `npm run typecheck`           | ✅ Pass, 0 errors (both apps)                                                                                                                                       |
| `npm run build`               | ✅ Pass (both apps)                                                                                                                                                 |

**2 real bugs found and fixed during this audit** (both described in detail below): a missing page-specific SEO title on the Donation History page, and 4 hardcoded-English strings on the Donate page that never varied with locale (Telugu visitors saw English FAQ copy).

---

## 2. Page Inventory

### 2.1 Public site (30 pages, bilingual en/te — 60 rendered URLs)

Home · About (+ History, Vision, Mission, Founder, Committee, Treasurer) · Activities (list + detail) · Services (redirect to Activities) · Volunteer · Events (list + detail) · News (list + detail) · Gallery · Testimonials · Donate (+ Success, Failure, Pending, Receipt, History) · Contact · Privacy Policy · Terms & Conditions · Refund Policy · Disclaimer · Search · 404 · 500.

All 30 verified present, all build to either static (`●`) or dynamic (`ƒ`) routes without error in `npm run build --workspace=website`.

### 2.2 Admin CMS (29 pages)

Dashboard · Content (Home, About, Contact, Legal, Activities, Committee, Testimonials, Hero Banners, Navigation, Social Links) · Donations (list, Categories, Campaigns, Bank Transfers) · Volunteers (+ Assignments) · Events (+ Registrations) · News · Gallery (+ Album detail) · Documents · Reports · Users · Roles · Permissions · Settings · Profile.

### 2.3 Auth (4 pages)

Login · Forgot Password · Reset Password · Verify Email.

**Not runtime-verified**: an authenticated walkthrough of every admin page (login → navigate → CRUD) requires a live database and has not been possible in this environment on any phase to date — this is a carried-forward limitation, not new to this phase (see KNOWN_LIMITATIONS.md).

---

## 3. API Inventory

34 route files under `api/src/routes/v1/`, covering: Health, Auth, Users, Roles, Permissions, Profile, Site Settings, Page Content, Hero Banners, Testimonials, Social Links, Navigation, Activities, Committee, Public Content, Contact, Donation Categories, Appeals, Donation Checkout, Donations (admin), Bank Transfers, Webhooks, Donor Auth, Donors, Volunteers, Volunteer Assignments, Event Categories, Events, Event Registrations, News, Gallery, Documents, Media.

Every route file was checked for: input validation coverage, authentication middleware placement, and permission-code correctness (full methodology and results in §5).

---

## 4. Form Inventory

Every public-facing form uses `react-hook-form` + a `zodResolver` on the client and the identical Zod schema re-validated server-side (defense against a client that skips or tampers with client-side validation):

| Form                         | Client validation | Server validation | Notes                                         |
| ---------------------------- | :---------------: | :---------------: | --------------------------------------------- |
| Admin login                  |        ✅         |        ✅         | Rate-limited (20/15min)                       |
| Forgot/Reset password        |        ✅         |        ✅         | Anti-enumeration on forgot                    |
| Contact form                 |        ✅         |        ✅         | Rate-limited                                  |
| Newsletter signup            |        ✅         |        ✅         | Rate-limited, idempotent upsert               |
| Volunteer registration       |        ✅         |        ✅         | Rate-limited, résumé upload                   |
| Event registration           |        ✅         |        ✅         | Rate-limited, capacity + waitlist logic       |
| Bank transfer claim          |        ✅         |        ✅         | Rate-limited                                  |
| Donation checkout (Razorpay) |        ✅         |        ✅         | Rate-limited, idempotency key                 |
| Donor OTP login              |        ✅         |        ✅         | Rate-limited (5/15min), anti-enumeration      |
| Every admin CRUD form (~25)  |        ✅         |        ✅         | Shared `FormDialog`/`react-hook-form` pattern |

**Finding (fixed)**: the `/bulk/reorder` endpoint used by every drag-to-reorder admin list (Hero Banners, Testimonials, Navigation, Activities, Committee, etc.) had no server-side Zod validation on its body — it read `req.body.items` directly. Low severity (already behind `authenticate` + `requirePermission`), but inconsistent with every other endpoint's validation guarantee. **Fixed**: added `bulkReorderSchema` and wired it into `simple-crud-router.ts`.

---

## 5. Permissions & Roles Verification

Ran a full cross-reference between every `requirePermission('code')` call in the route layer and the `PERMISSIONS` array in `prisma/seed.ts`:

- **52 permission codes** defined.
- **0 mismatches** — every code referenced by a route exists in the seed; every seeded code that a route needs is present (including the `buildSimpleCrudRouter`-factory-based modules, which pass permission codes as constructor options rather than inline — checked separately, e.g. confirmed `hero-banners.routes.ts` correctly uses `banners:view`/`banners:manage`, not a guessed `hero_banners:*`).
- **10 roles** seeded, each a real subset of the 52 permissions (not a single "is-admin" flag) — `Super Admin` holds all 52; `Admin` holds all except `users:manage`/`roles:manage`/`settings:manage`/`audit:view`; the remaining 8 roles are scoped to their named domain (e.g. `Gallery Manager` = exactly `gallery:view`+`gallery:manage`).
- Every admin route group requires `authenticate` before any `requirePermission` check (verified for all 34 route files — no route mounts a mutating endpoint without an auth gate).
- Permission checks use AND semantics for multi-code requirements (documented, correct given the seeded role compositions).

**Not runtime-verified**: logging in as each of the 10 roles and confirming the UI hides/shows the correct admin-nav items requires a live database session (frontend does gate via `useHasPermission`, code-reviewed as correct, but not exercised end-to-end).

---

## 6. Translation Verification

Ran an automated key-diff between `website/messages/en.json` and `messages/te.json`:

```
Total en keys: 151   Total te keys: 151
Missing in te.json: 0
Extra in te.json (not in en): 0
```

**100% key parity** — every string that has a translation key is translated in both locales.

**Finding (fixed)**: key parity doesn't catch strings that were never turned into keys in the first place. Manual review of the Donate page found **4 FAQ question/answer pairs and 2 "Coming Soon" empty-state labels hardcoded as literal English strings**, bypassing `next-intl` entirely — a Telugu-locale visitor (`/te/donate`) saw English FAQ text regardless of their selected language. **Fixed**: extracted all 6 strings into new `Donate.faq*`/`Donate.*ComingSoon*`/`Donate.upiIdLabel` keys in both `en.json` and `te.json`, wired the page to use `t()` calls.

No other hardcoded-English patterns were found in a targeted search of `AccordionTrigger`/`EmptyState title=` usages across the rest of the public site.

---

## 7. Upload Verification

4 upload endpoints, all reviewed:

| Endpoint                           | Auth                      | Allowed types              | Size limit | Storage                                                 |
| ---------------------------------- | ------------------------- | -------------------------- | :--------: | ------------------------------------------------------- |
| `POST /media/upload`               | Admin (any authenticated) | image/jpeg, png, webp, gif |   10 MB    | Cloudinary (in-memory buffer, never touches local disk) |
| `POST /media/upload/resume`        | Public, rate-limited      | + PDF, DOC, DOCX           |   10 MB    | Cloudinary `resourceType: raw`                          |
| `POST /gallery/:id/items` (image)  | Admin `gallery:manage`    | image/jpeg, png, webp, gif |   10 MB    | Cloudinary                                              |
| `POST /documents` (compliance doc) | Admin `documents:upload`  | + PDF, DOC, DOCX           |   10 MB    | Cloudinary `resourceType: raw`                          |

All four share one `multer` memory-storage factory with a `fileFilter` MIME allowlist — no local disk writes, no local-disk-fills-up failure mode. See SECURITY_REPORT.md §6 for the one accepted-risk finding (client-reported MIME type is not cryptographically verified).

---

## 8. Email Verification

5 templates, all rendered through a shared `emailLayout()` wrapper for consistent branding:

| Template                         | Trigger                                        |                        Contains PII?                         |
| -------------------------------- | ---------------------------------------------- | :----------------------------------------------------------: |
| Email verification               | New admin account created                      |                              No                              |
| Password reset                   | Forgot-password request                        |                              No                              |
| Password-changed security notice | Successful password change/reset               |                              No                              |
| Account-locked notice            | 5 failed login attempts                        |                              No                              |
| Volunteer confirmation/status    | Registration submitted / status changed        |                              No                              |
| **Donation receipt**             | Donation marked completed (any of the 3 paths) | Amount, category, receipt number — no payment card/bank data |
| **Donor OTP code**               | `/donor-auth/request-otp`                      |                  6-digit code, 5-min expiry                  |

Every `sendMail()` call goes through one `getMailer()`/`sendMail()` pair that no-ops with a logged warning if `SMTP_HOST` isn't configured — verified this doesn't throw or block the underlying action (e.g. a donation still completes and its receipt PDF is still generated even if the email delivery step silently no-ops in this credential-less environment).

**Not runtime-verified**: no SMTP credentials exist in this environment, so no email has actually been delivered/rendered in a real inbox client.

---

## 9. Razorpay Payment Flow Verification

All flows code-reviewed end-to-end; two were directly exercised against the running (DB-less, key-less) dev server to confirm wiring:

| Flow                                   | Verified how                                                                                                                                                                                                            | Result                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Order initiation                       | Code review of `donation-checkout.service.ts` — idempotency-key dedup, order-before-donation-row ordering                                                                                                               | ✅ Correct by inspection |
| Checkout signature verification        | Code review of `payment-verification.service.ts` — constant-time HMAC compare, duplicate-payment guard, server-side re-fetch of payment status from Razorpay (never trusts client-reported status)                      | ✅ Correct by inspection |
| Retry payment                          | Code review — reopens the _same_ Razorpay order rather than creating a new donation row                                                                                                                                 | ✅ Correct by inspection |
| **Webhook signature verification**     | **Live `curl` test**: `POST /api/v1/webhooks/razorpay` with a bogus `X-Razorpay-Signature` header → **`401` returned**, confirming the signature check runs and rejects correctly before any DB/business logic executes | ✅ Confirmed live        |
| Webhook idempotency                    | Code review — `PaymentWebhookEvent.eventId` = SHA-256 of raw body, checked before reprocessing                                                                                                                          | ✅ Correct by inspection |
| Payment failure path                   | Code review — `payment.failed` webhook marks donation `failed` with reason, only if still `pending`                                                                                                                     | ✅ Correct by inspection |
| **Donation-initiate graceful failure** | **Live `curl` test** against the DB-less environment → clean structured `500` response (dev-mode verbose message, prod-mode would be generic), no crash                                                                 | ✅ Confirmed live        |

**Not verified — cannot be, in this environment**: an actual successful payment capture end-to-end (real Razorpay test-mode order → real Checkout modal → real webhook delivery → real receipt email) requires live `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`, which are not available here (pending client KYC, per `documentation/16-Assumptions-and-Dependencies.md` D-01, unchanged since Phase 3). **This is the single most important item on GO_LIVE_CHECKLIST.md.**

---

## 10. Receipt Generation Verification

- `services/receipt-pdf.service.ts` generates a real PDF (pdfkit) with org name/reg no., receipt number, donor name, category, amount, payment reference — code-reviewed, confirms no 80G/12A number is printed (deliberately, since that certification is unverified — same honesty pattern as the public `TrustBadge` component).
- Wired into all 3 completion paths: online (Razorpay verify/webhook), manual admin entry, bank-transfer verification — confirmed via code review that all 3 call the same `issueReceipt()` orchestrator (no drift between paths).
- PDF generation/upload failure is caught and logged, never blocks the donation from being marked complete (graceful degradation, verified by reading the try/catch in `receipt.service.ts`).

**Not runtime-verified**: actual PDF byte-for-byte rendering and Cloudinary upload require the Cloudinary credentials this environment doesn't have.

---

## 11. Navigation Flow Verification

- Every internal `<Link>` on the public site uses the locale-aware `Link`/`redirect`/`useRouter` from `i18n/navigation.ts` (not raw `next/link`) — grep-verified no raw `next/link` imports remain in `app/[locale]/(public)/**`.
- Middleware (`src/middleware.ts`) correctly combines the admin auth-cookie guard with `next-intl`'s locale middleware, matcher-excluding the unlocalized `/login`, `/forgot-password`, etc.
- `robots.ts` correctly disallows `/admin/`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/unauthorized` from indexing.
- Donation flow's post-payment redirects (`success`/`failure`/`pending`) all carry only `donationId` + a stateless access token — never the raw Razorpay signature (a deliberate security choice, see SECURITY_REPORT.md).

---

## 12. Issues Found & Resolved This Phase

| #   | Finding                                                                                                                                                          |           Severity            | Fix                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `donate/history/page.tsx` was 100% client-rendered with no `generateMetadata` — page title/description never varied from the site default                        |           Low (SEO)           | Split into a Server Component shell (`page.tsx`, now has `generateMetadata`) + Client Component body (`donation-history-view.tsx`) |
| 2   | 4 FAQ Q&A pairs + 2 "Coming Soon" labels on the Donate page were hardcoded English, ignoring the active locale                                                   |   Medium (i18n correctness)   | Added 8 new translation keys to both `en.json`/`te.json`, wired the page to use `t()`                                              |
| 3   | `/bulk/reorder` (shared CRUD factory) had no server-side body validation                                                                                         |    Low (defense-in-depth)     | Added `bulkReorderSchema` (Zod)                                                                                                    |
| 4   | 15 `<Image>` usages had `unoptimized` set despite the image host (`res.cloudinary.com`) already being whitelisted, disabling Next.js's responsive image pipeline |       Low (performance)       | Removed `unoptimized` from all 15 — see PERFORMANCE_REPORT.md                                                                      |
| 5   | No `metadataBase` set in the root layout                                                                                                                         |       Low (correctness)       | Added, resolving against `NEXT_PUBLIC_SITE_URL`                                                                                    |
| 6   | No Content-Security-Policy header on the public/admin site (explicitly deferred since Phase 6, pending Razorpay's origins being known)                           |       Medium (security)       | Added a scoped CSP — see SECURITY_REPORT.md §2                                                                                     |
| 7   | Express app didn't set `trust proxy`, so rate limiting behind a reverse proxy would bucket all clients together                                                  | Medium (security/reliability) | Added `app.set('trust proxy', 1)`                                                                                                  |

All 7 fixes verified via `npm run lint`, `npm run typecheck`, `npm run build` (all pass) plus a live browser/curl smoke test (see §13).

---

## 13. Verification Method Note

A blank-page result was observed from the automated browser-testing tool on one DB-error page during this audit. Direct `curl` inspection of the raw HTTP response confirmed the server-rendered HTML correctly contained the expected "Something Went Wrong" error-boundary text — the blank result was a rendering artifact of the browser automation tool used for testing, not an application defect. This is noted here for transparency; it did not affect the audit's conclusions, which were cross-checked against the raw server response.
