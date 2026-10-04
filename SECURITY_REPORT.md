# Security Report

## Sai Yadadri Seva Ashram Platform — Final Phase: Production Readiness

|            |                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**  | Authentication, Authorization, Cookies, JWT, Environment Variables, File Uploads, Rate Limiting, Input Validation, SQL Injection, XSS, CSRF, Headers, Secrets |
| **Date**   | 2026-08-04                                                                                                                                                    |
| **Method** | Full source review of `api/src` (backend, primary attack surface) and `website/src` (frontend), plus live signature-rejection testing                         |

---

## 1. Authentication

### 1.1 Admin authentication

| Control                     | Implementation                                                                                                                                               | Verdict |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-----: |
| Password hashing            | bcrypt, configurable salt rounds (`BCRYPT_SALT_ROUNDS`, default 12, min 10)                                                                                  |   ✅    |
| Password policy             | 12+ chars, upper/lower/digit/special-char required (`PASSWORD_COMPLEXITY_REGEX`), enforced server-side on every password-setting path                        |   ✅    |
| Access token                | Short-lived JWT (default 15 min), `HS256` via `jsonwebtoken`, secret enforced ≥32 chars at boot (`env.ts` Zod schema — app refuses to start otherwise)       |   ✅    |
| Refresh token               | **Not** a JWT — opaque, high-entropy (32 bytes), SHA-256-hashed before storing, DB-backed (`Session` table), rotated on every refresh, immediately revocable |   ✅    |
| Session revocation          | Every authenticated request re-checks the `Session` row isn't revoked/expired — logout/logout-all-devices take effect immediately, not just at token expiry  |   ✅    |
| Account lockout             | 5 failed attempts → locked 15 min (configurable), emails a security notice, resets automatically on successful password reset                                |   ✅    |
| Anti-enumeration            | Forgot-password and donor-OTP-request both return an identical response whether or not the account/email exists                                              |   ✅    |
| Email verification required | Login blocked (`403`) until email is verified                                                                                                                |   ✅    |

### 1.2 Donor authentication (Phase 7)

Deliberately lighter-weight (design decision, documented in `lib/donor-jwt.ts`): a stateless JWT (`type: 'donor'` discriminator, 24h expiry), issued only after a 6-digit email OTP is verified (5-min TTL, max 5 attempts, anti-enumeration). No password to manage — appropriate for a low-risk, read-only convenience feature (viewing one's own donation history), not treated as a security-critical account system. The donor JWT payload's `type` field prevents it from ever being accepted by the admin `authenticate` middleware even if a donor token were somehow presented there.

### 1.3 Verdict: **Solid.** No changes made.

---

## 2. Authorization

- Every one of the 34 backend route files was checked: all admin/mutating routes sit behind `authenticate` (session-validating middleware) followed by `requirePermission(code)` (database-driven RBAC check).
- Cross-referenced all **52 permission codes** referenced by `requirePermission()` calls against the seeded `PERMISSIONS` array — **0 mismatches**. Verified this both for hand-written routers and for the 7 modules built on the generic `buildSimpleCrudRouter` factory (which applies `authenticate`+`requirePermission` internally — confirmed by reading the factory source, not just its call sites).
- Permission checks are **AND semantics** (a route requiring 2 codes needs both) — matches how the 10 seeded roles are composed as real permission subsets, not a single "is admin" flag.
- Donor-facing data is explicitly re-shaped before returning: `GET /donors/me/donations` never returns the admin-only `internalNote` field, even though the underlying repository query would include it — a real data-minimization control, not an oversight (see `donor-donations.service.ts`).
- The donation-receipt endpoint (`GET /donations/:id/receipt`) accepts three distinct proofs of authorization — a stateless per-donation token, a donor session (scoped to their own donation only, checked via `donorId` match), or an admin session — each checked explicitly, fails closed (`401`) if none match.

**Verdict: Solid.** No changes made.

---

## 3. Cookies

| Cookie               | httpOnly | secure (prod) | sameSite | Notes                    |
| -------------------- | :------: | :-----------: | :------: | ------------------------ |
| `sysa_access_token`  |    ✅    |      ✅       |  `lax`   | Admin JWT                |
| `sysa_refresh_token` |    ✅    |      ✅       |  `lax`   | Opaque, DB-backed        |
| `sysa_donor_token`   |    ✅    |      ✅       |  `lax`   | Donor JWT, added Phase 7 |

All three are never readable by client-side JavaScript. `sameSite=lax` is the deliberate choice documented in `lib/cookies.ts`: the admin dashboard and API are same-site in the deployed topology, so `lax` is sufficient and avoids the friction `strict` would add to top-level navigations (e.g. clicking a password-reset link from an email). See §10 (CSRF) for how this interacts with cross-site request forgery risk.

**Verdict: Solid.** No changes made.

---

## 4. JWT

- Access tokens: `HS256`, secret validated at process boot to be ≥32 characters (fails fast, not at first use — `env.ts`).
- Donor tokens: same signing secret, disambiguated by a `type: 'donor'` claim so a donor token can never be accepted where an admin token is expected (checked explicitly in `verifyAccessToken`/`verifyDonorToken`, which are separate functions, not a shared one with a type-cast).
- Refresh tokens are deliberately **not** JWTs (see §1.1) — this is the correct architectural choice for a token that needs to be revocable before its natural expiry.
- No JWT claims contain sensitive data beyond an ID and a role name (used only for lightweight client-side UI decisions, `role` is **never** trusted for authorization — every authorization decision re-checks permissions from the database via `req.user.permissions`, populated fresh on every request from the `Session` → `AdminUser` → `Role` → `RolePermission` join).

**Verdict: Solid.** No changes made.

---

## 5. Environment Variables & Secrets

- `.gitignore` correctly excludes `.env`, `.env.local`, `.env.*.local`, with an explicit `!.env.example` allowlist exception — verified no real secret has ever been committed (all `.env`/`.env.example` files in the repo have blank secret values).
- `api/src/config/env.ts` is the single source of truth for required configuration, validated with Zod at boot — a missing/malformed required variable crashes the process immediately with a clear error, rather than failing confusingly at first use.
- `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`, `CLOUDINARY_*`, `SMTP_*` are all optional at the schema level (the features that need them fail gracefully with a clear message when absent, rather than crashing the whole server) — appropriate since this environment genuinely doesn't have them yet.
- No secret is ever logged: `request-logger.middleware.ts` logs only method/path/status/duration/IP, never headers or bodies.

**Verdict: Solid.** No changes made.

---

## 6. File Uploads

4 upload endpoints (full detail in QA_REPORT.md §7), all sharing one `multer` memory-storage configuration:

- **MIME allowlist**: images restricted to jpeg/png/webp/gif; documents additionally allow PDF/DOC/DOCX. Anything else is rejected with `400` before the file is ever processed.
- **Size limit**: 10 MB, enforced by `multer`'s `limits.fileSize` (rejects oversized uploads before they're fully buffered).
- **No local disk writes**: `multer.memoryStorage()` — files stream directly to Cloudinary; nothing is ever written to the API server's filesystem, eliminating an entire class of local-disk-exhaustion or path-traversal risk.
- **Rate limiting**: the one genuinely public (unauthenticated) upload endpoint, `/media/upload/resume`, is rate-limited (10/15min).

### Finding — accepted risk, not fixed this phase

`fileFilter`'s MIME check reads `file.mimetype`, which is the **client-reported** `Content-Type` from the multipart form field — a malicious client can set this header to anything regardless of the actual file bytes (e.g. upload a script renamed with `Content-Type: image/jpeg`). This is a real, known class of gap.

**Why not fixed now**: closing it properly requires magic-byte/content sniffing (e.g. the `file-type` npm package) — a new dependency that would need to be exercised against real uploads to confirm it doesn't reject legitimate files, which this environment cannot do (no live Cloudinary credentials, no way to test the full upload round-trip). Introducing an unverified new dependency into the upload path this late, untested, carries more risk than the gap it closes.

**Why the current exposure is limited**:

- Uploaded files are never executed server-side — they are opaque blobs relayed straight to Cloudinary.
- Image uploads are re-encoded by Cloudinary on ingest (`quality:auto, fetch_format:auto`), which strips most embedded-payload tricks.
- Every upload endpoint either requires admin authentication, or (for the one public one) is narrowly scoped to a specific folder/purpose and rate-limited.
- Uploaded documents go through a human admin review step (visibility toggle) before being surfaced publicly.

**Recommendation for a follow-up**: add `file-type`-based magic-byte verification in `upload.middleware.ts`'s `fileFilter`, tested against the actual file types this app handles, before the next security review cycle.

---

## 7. Rate Limiting

Baseline: 300 req/15min globally (`app.use(rateLimit(...))` in `app.ts`). Stricter, endpoint-specific limits layered on top of every sensitive/public write path:

| Endpoint group                 | Limit                                                    |
| ------------------------------ | -------------------------------------------------------- |
| Admin login/refresh            | 20 / 15 min                                              |
| Contact form + newsletter      | 10 / 15 min                                              |
| Bank transfer claim            | not separately limited — covered by global baseline only |
| Volunteer registration         | limited (see `volunteers.routes.ts`)                     |
| Event registration             | limited (see `event-registrations.routes.ts`)            |
| Public résumé upload           | 10 / 15 min                                              |
| Donation initiate/verify/retry | 20 / 15 min                                              |
| Donor OTP request/verify       | 5 / 15 min                                               |
| Razorpay webhook               | **not** separately limited (deliberate — see below)      |

**Finding (fixed)**: none of this is effective behind a reverse proxy without `app.set('trust proxy', 1)` — without it, `express-rate-limit` (and any `req.ip`-based logic) sees the proxy's IP for every request, meaning all clients behind the proxy share one rate-limit bucket (one bad actor could lock out everyone else). The project's own deployment architecture (`docker-compose.yml`, `infrastructure/nginx/`) puts Nginx in front of the API. **Fixed**: added `app.set('trust proxy', 1)`.

The webhook route is intentionally **not** rate-limited beyond the global baseline — trust there comes entirely from the HMAC signature check, and no user-facing rate limit should ever risk dropping a legitimate Razorpay delivery.

**Verdict: Fixed one real gap (trust proxy); rate-limit coverage itself is otherwise comprehensive.**

---

## 8. Input Validation

Every route that accepts a body/query/params either uses the shared `validate()` Zod middleware directly, or (for the 7 `buildSimpleCrudRouter`-based modules) gets it applied generically by the factory.

**Finding (fixed)**: the one exception was `/bulk/reorder` (the drag-to-reorder endpoint shared by every simple-CRUD admin list), which read `req.body.items` with a raw TypeScript cast and no runtime check. Low severity (already behind `authenticate`+`requirePermission`, so only an authorized admin's own malformed request could trigger it — not an external attack surface), but inconsistent with the rest of the API's validation guarantee. **Fixed**: added `bulkReorderSchema` (array of `{id: uuid, displayOrder: non-negative int}`, min 1 item) and wired it in.

**Verdict: Fixed the one gap found; coverage is otherwise complete.**

---

## 9. SQL Injection

- All data access goes through Prisma's generated client (parameterized queries throughout) — no string-concatenated SQL anywhere in the codebase.
- The one exception, `donation.repository.ts`'s `getAnalytics()`, uses `prisma.$queryRaw` with a **tagged template literal** (`Prisma.sql` interpolation) — Prisma parameterizes tagged-template `$queryRaw` calls automatically; this is the documented-safe pattern, not raw string concatenation. Verified by reading the actual call site: all interpolated values (`dateFrom`, `dateTo`) go through `Prisma.sql` fragments, never string-embedded directly.

**Verdict: Solid. Not exploitable.**

---

## 10. XSS Protection

- Every piece of admin-authored rich-text content (page content, news bodies, event/activity descriptions) is sanitized **twice**: once client-side in the admin rich-text editor on save (`dompurify`), and again server-side on every public render (`isomorphic-dompurify` in `lib/sanitize.ts`, restricted to a narrow tag/attribute allowlist: `p, br, strong, b, em, i, u, h2, h3, ul, ol, li, a, img` / `href, target, rel, src, alt`) — defense in depth, since the render-time sanitization is what actually protects visitors regardless of what made it into the database.
- No `dangerouslySetInnerHTML` usage was found outside the one `RichContent` component that performs this sanitization.
- React's default JSX escaping handles every other piece of dynamic text.

**Verdict: Solid.** No changes made.

---

## 11. CSRF Protection

**No explicit anti-CSRF token exists.** This is a deliberate, documented tradeoff, not an oversight — assessed here rather than blindly implemented, because retrofitting a token-based CSRF scheme this late (touching every mutating form across two apps) carries real risk of breaking something untested in an environment with no live database to verify against.

**Current mitigation, and why it's meaningful (not a non-answer):**

1. **`sameSite=lax`** on every auth cookie — modern browsers do not attach `lax` cookies to cross-site **subrequests** (the vector classic CSRF exploits use: an `<img>`/auto-submitting `<form>` on an attacker's page triggering a background request to this API). `lax` cookies are only sent on top-level, user-initiated navigations, which cannot carry an attacker-controlled JSON body.
2. **Strict, single-origin CORS** (`CORS_ORIGIN`, not a wildcard, `credentials: true`) — a cross-origin `fetch()`/XHR from any other site is blocked by the browser's CORS preflight before it can even reach the server with credentials attached.
3. **JSON `Content-Type` requirement** — every mutating endpoint expects `application/json`, which cannot be set by a plain HTML `<form>` (forms can only submit `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`), closing off the classic no-JS CSRF form-submission vector entirely.

Together, (1)+(2)+(3) is a well-understood, commonly-relied-upon combination that many production SPA/API architectures use **instead of** explicit CSRF tokens (rather than as a weaker fallback). It is not equivalent to a cryptographic anti-CSRF token, but it closes the practical exploitation paths for this architecture (single frontend origin, JSON-only API, no plain-HTML-form submission path to any mutating endpoint).

**Recommendation for a follow-up**: if a second frontend origin is ever added (e.g. a mobile app calling the same API with a different CORS entry, or a public API for partners), revisit this — the SameSite+CORS argument gets weaker as more trusted origins are added to `CORS_ORIGIN`. A double-submit-cookie CSRF token would be the standard next step.

---

## 12. Security Headers

| Header                                                                   | Value                             | Source                         |
| ------------------------------------------------------------------------ | --------------------------------- | ------------------------------ |
| `X-Content-Type-Options`                                                 | `nosniff`                         | `next.config.ts` (web)         |
| `X-Frame-Options`                                                        | `DENY`                            | `next.config.ts` (web)         |
| `Referrer-Policy`                                                        | `strict-origin-when-cross-origin` | `next.config.ts` (web)         |
| `Content-Security-Policy`                                                | **New this phase** — see below    | `next.config.ts` (web)         |
| Helmet defaults (`X-Powered-By` removed, `X-DNS-Prefetch-Control`, etc.) | Applied                           | `app.ts` (api, via `helmet()`) |

### Finding (fixed): CSP was entirely absent

Deferred since Phase 6 with an explicit code comment: _"Content-Security-Policy is intentionally deferred to the feature-development phase, once third-party script origins (Razorpay, analytics) are finalized."_ Razorpay is now integrated (Phase 7), so the deferral's precondition is satisfied.

**Fixed** — added a concrete, scoped CSP:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://checkout.razorpay.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com;
font-src 'self' data:;
connect-src 'self' <API origin, resolved from NEXT_PUBLIC_API_URL at build time> https://api.razorpay.com https://lumberjack.razorpay.com;
frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

**Why `'unsafe-inline'` is present on `script-src`/`style-src`**: Next.js App Router ships an inline hydration bootstrap script with no nonce infrastructure wired into this project. A stricter, nonce-based CSP is a real, worthwhile hardening step (see KNOWN_LIMITATIONS.md) but is a larger, riskier change than is safe to make untested here — a misconfigured nonce CSP can silently break hydration in a way that's _worse_ for production-readiness than shipping a slightly looser (but still meaningfully restrictive) policy. The current policy still blocks arbitrary third-party script/frame/image/connect origins — it is not a no-op.

**Verified live**: confirmed via `curl -I` that the header is actually sent with the correct values (including the dynamically-resolved API origin), and via browser console + raw-HTML inspection that the site continues to render and function correctly with the CSP active (no CSP violation messages observed; login page fully functional; `connect-src` correctly allows the cross-origin API calls the public site's client-side code makes).

---

## 13. Duplicate Payment Prevention

Specifically called out since it's a payment-system correctness _and_ security concern:

- **Database-level**: `Donation.paymentGatewayRef` and `Donation.razorpayOrderId` both have unique constraints — the database itself refuses to attach the same Razorpay payment/order ID to two donation rows.
- **Application-level**: an explicit `findByPaymentGatewayRef` lookup runs before marking a donation complete; a `P2002` (unique-constraint violation) from a lost race is caught and mapped to a clean `409 Conflict` rather than a raw DB error leaking out.
- **Idempotent webhook processing**: `PaymentWebhookEvent.eventId` (SHA-256 of the raw webhook body) prevents Razorpay's automatic retry-on-non-2xx behavior from ever reprocessing the same delivery twice.
- **Idempotent donation initiation**: a client-generated `idempotencyKey` (unique-constrained) means a network-retried `/donations/initiate` call returns the existing session instead of creating a second pending donation.

**Verdict: Solid, layered correctly (DB constraint as the backstop, application checks for a clean error message).**

---

## 14. Summary of Changes Made This Phase

| #   | Change                                                               | File(s)                                                                    |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Added Content-Security-Policy header                                 | `website/next.config.ts`                                                   |
| 2   | Added `trust proxy` for correct rate-limiting behind a reverse proxy | `api/src/app.ts`                                                           |
| 3   | Added missing Zod validation on `/bulk/reorder`                      | `api/src/lib/simple-crud-router.ts`, `api/src/validation/common.schema.ts` |

## 15. Accepted Risks (Documented, Not Fixed)

| #   | Risk                                                            | Mitigation in place                                                                                                          | Recommended follow-up                                                                        |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | No cryptographic anti-CSRF token                                | SameSite=Lax cookies + strict single-origin CORS + JSON-only mutating endpoints                                              | Double-submit-cookie token if a second frontend origin is ever added                         |
| 2   | File upload MIME check is client-reported, not content-verified | No server-side execution of uploads; Cloudinary re-encodes images; narrow scoping + rate limits; human review before publish | Add `file-type` magic-byte verification                                                      |
| 3   | CSP requires `'unsafe-inline'` for scripts/styles               | Still restricts third-party script/frame/connect/img origins meaningfully                                                    | Nonce-based strict CSP (requires Next.js middleware changes, needs live-environment testing) |

No other security findings were identified in this review.
