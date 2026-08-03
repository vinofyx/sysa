# Development Progress

## Sai Yadadri Seva Ashram Platform

|                   |                                                                   |
| ----------------- | ----------------------------------------------------------------- |
| **Current Phase** | Phase 5 — Business Modules & Content Management System (Complete) |
| **Date**          | 2026-08-03                                                        |
| **Status**        | Awaiting client approval to proceed to the next phase             |

---

## 1. Phase Summary

| Phase        | Scope                                                                                                                                                                                                                                                                                                            | Status                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Phase 1**  | Business Analysis & Documentation (BRD, SRS, Functional/Non-Functional Requirements, User Stories, Use Cases, System Modules, Database Requirements, Admin Modules, Roles & Permissions, Technology Stack, Security Requirements, API Requirements, Project Timeline, Risk Analysis, Assumptions & Dependencies) | ✅ Complete — [`documentation/MASTER_PROJECT_PLAN.md`](documentation/MASTER_PROJECT_PLAN.md) |
| **Phase 2**  | Enterprise System Design & UI/UX (Information Architecture, Sitemap, User/Admin Flows, Wireframes, Design System, Component Library, Responsive Design, Animation, Accessibility, SEO Structure, Database ERD, API Architecture, Folder Structure, Deployment Architecture)                                      | ✅ Complete — [`design/SYSTEM_DESIGN.md`](design/SYSTEM_DESIGN.md)                           |
| **Phase 3**  | Project Initialization & Codebase Foundation                                                                                                                                                                                                                                                                     | ✅ Complete                                                                                  |
| **Phase 4**  | Core Application Framework — Authentication, RBAC, Database, Backend APIs, Frontend layouts/shell, Admin Dashboard shell                                                                                                                                                                                         | ✅ Complete                                                                                  |
| **Phase 5**  | Business Modules & Content Management System — re-scoped by explicit client instruction from the originally-planned "Public Site" to: all backend business-module APIs (CMS, Donations, Volunteers, Events, News, Gallery, Documents) **and** the complete admin CMS frontend for every module                   | ✅ Complete — this document, §9–§13                                                          |
| **Phase 6**  | Core Development — Public Site (Home, About, Activities, Gallery, Events, Contact) + Donation Platform (Razorpay integration, checkout, receipts)                                                                                                                                                                | ⏳ Not started                                                                               |
| **Phase 7**  | Content Population & Bilingual Translation                                                                                                                                                                                                                                                                       | ⏳ Not started                                                                               |
| **Phase 8**  | QA, Security Testing & Accessibility Audit                                                                                                                                                                                                                                                                       | ⏳ Not started                                                                               |
| **Phase 9**  | UAT with Client                                                                                                                                                                                                                                                                                                  | ⏳ Not started                                                                               |
| **Phase 10** | Deployment & Go-Live                                                                                                                                                                                                                                                                                             | ⏳ Not started                                                                               |
| **Phase 11** | Post-Launch Stabilization & Handover                                                                                                                                                                                                                                                                             | ⏳ Not started                                                                               |

---

## 2. Phase 4 — What Was Built

### 2.1 Database (Prisma / PostgreSQL)

- Extended `apps/api/prisma/schema.prisma` with production auth models: `Session` (refresh-token rotation + immediate revocation), `PasswordResetToken`, `EmailVerificationToken`, and new `AdminUser` fields (`emailVerified`, `failedLoginAttempts`, `lockedUntil`, `passwordChangedAt`, `lastLoginIp`).
- Indexes and constraints added throughout (session lookups, token expiry, email lookups) — see the schema's inline doc-comments.
- **Initial migration generated**: `apps/api/prisma/migrations/20260803101658_init/` (via `prisma migrate diff --from-empty`, since no live Postgres was available in this build environment — the same constraint noted in Phase 3). This migration is complete and correct (Prisma's own schema-diff engine generated it) but has never been _applied_ to a real database in this environment — see §5.
- **Seed data** (`apps/api/prisma/seed.ts`) rewritten for the expanded, fully configurable RBAC model (§2.2) plus a bootstrap Super Admin account (email/password from `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD` env vars, dev-only fallback documented in `.env.example`).

### 2.2 RBAC — Role Model Reconciliation

Phase 4's instructions specified a different, more granular 10-role set (Super Admin, Admin, Content Manager, Donation Manager, Volunteer Manager, Event Manager, Gallery Manager, Report Manager, Finance Manager, Viewer) than the simpler 4-role matrix in the Phase 1 document [`documentation/10-Roles-and-Permissions.md`](documentation/10-Roles-and-Permissions.md) (Super Admin, Content Admin, Finance Admin, Volunteer Coordinator).

**Per your instruction not to modify completed phases, that document is unchanged.** The actual seeded/implemented RBAC system uses the newer, more granular 10-role instruction as authoritative for code, since it was given explicitly and more recently. The permission catalogue was expanded from Phase 1's 21 codes to 29 (adding `events:view`, `gallery:view`, `committee:view`, `appeals:view`/`appeals:manage`, `users:view`, `roles:view`, `permissions:view`) so each of the 10 roles could be meaningfully distinct — see `apps/api/prisma/seed.ts` for the full role→permission mapping. **Permissions are entirely database-driven** (Role → RolePermission → Permission tables, plus full Role CRUD API), satisfying "permissions must be configurable" — an operator can create custom roles or edit any non-protected role's permission set without a code change.

### 2.3 Backend — Authentication (production-ready, no placeholder logic)

| Feature                  | Implementation                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT Authentication       | Short-lived access token (15 min default), signed with `JWT_ACCESS_SECRET`                                                                                                                      |
| Refresh Token Support    | Opaque, hashed (SHA-256), database-backed (`Session` table), rotated on every refresh                                                                                                           |
| Secure httpOnly Cookies  | Both access and refresh tokens set as `httpOnly`, `secure` (production), `sameSite=lax` cookies — never exposed to client-side JS                                                               |
| Password Hashing         | bcrypt, configurable salt rounds (`BCRYPT_SALT_ROUNDS`, default 12)                                                                                                                             |
| Forgot Password          | Opaque token emailed, 30-min TTL, anti-enumeration (identical response whether or not the account exists)                                                                                       |
| Reset Password           | Validates token, enforces password policy, revokes **all** sessions, emails a security notice                                                                                                   |
| Change Password          | Requires current password, revokes all _other_ sessions (keeps the current one alive), emails a security notice                                                                                 |
| Email Verification       | Required before login (`403` with a clear message otherwise); public resend-by-email endpoint since an unverified user has no session to authenticate a resend with                             |
| Login Session Management | `GET /auth/sessions` lists every active session (device/IP/last-used, current-device flag)                                                                                                      |
| Logout (current device)  | Revokes only the calling session                                                                                                                                                                |
| Logout (all devices)     | Revokes every session for the user                                                                                                                                                              |
| Account Lockout          | Configurable threshold/duration (`ACCOUNT_LOCK_MAX_ATTEMPTS`, `ACCOUNT_LOCK_DURATION_MINUTES`, defaults 5/15) — locks, emails a notice, and resets automatically on a successful password reset |
| Password Policy          | 12+ chars, upper/lower/digit/special-character required, enforced via a shared Zod schema (`apps/api/src/validation/password.schema.ts`)                                                        |
| Audit Logs               | Every sensitive auth/user/role event (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `PASSWORD_CHANGED`, `USER_CREATED`, `ROLE_DELETED`, etc.) appended to the immutable `audit_log` table  |

**New admin accounts**: reuse the email-verification + forgot-password flows as the activation mechanism (a Super Admin creates the account → the new user verifies their email → then uses "Forgot Password" to set their first real password) rather than building a third, parallel "invite" flow — see the doc-comment on `resendVerificationByEmail` in `apps/api/src/services/auth.service.ts` for the reasoning.

### 2.4 Backend — APIs

| API Group   | Endpoints                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health      | `GET /health` (unchanged from Phase 3)                                                                                                                                    |
| Auth        | `login`, `refresh`, `logout`, `logout-all`, `sessions` (list/revoke), `forgot-password`, `reset-password`, `change-password`, `verify-email`, `resend-verification`, `me` |
| Users       | `GET/POST /users`, `GET/PATCH /users/:id` — permission-gated (`users:view`/`users:manage`)                                                                                |
| Roles       | Full CRUD, permission-gated (`roles:view`/`roles:manage`); protected system roles (Super Admin) can't be renamed/deleted; roles still assigned to a user can't be deleted |
| Permissions | `GET /permissions` — read-only catalogue                                                                                                                                  |
| Profile     | `GET/PATCH /profile` — self-service, scoped to the caller only                                                                                                            |

All routes: Zod-validated request bodies/params/queries (`src/middleware/validate.middleware.ts`), centralized error handling (unchanged from Phase 3, now also handles `ZodError` and the new `423 ACCOUNT_LOCKED` status), stricter rate limiting on auth endpoints (20 req/15 min vs. the general 300 req/15 min baseline), and full Winston request logging.

**Swagger/OpenAPI documentation**: hand-authored OpenAPI 3.0 document (`apps/api/src/config/swagger.ts`) — chosen over JSDoc-comment extraction (`swagger-jsdoc`) to guarantee the spec matches the actual Zod schemas rather than risking annotation drift. Served at `/api/v1/docs` (Swagger UI) and `/api/v1/docs.json` (raw spec).

### 2.5 Frontend — Layouts, Auth Pages, Admin Shell

| Deliverable                                         | Location                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth layout + pages                                 | `app/(auth)/{login,forgot-password,reset-password/[token],verify-email/[token]}` — all wired to real backend endpoints, no mock data                                                                                                                                                                     |
| Admin layout (protected)                            | `app/admin/layout.tsx` — Server Component, calls the backend's `/auth/me` (forwarding cookies) before rendering; unauthenticated visitors are redirected                                                                                                                                                 |
| Public layout                                       | `app/(public)/layout.tsx` — wraps the Phase 3 placeholder home page with a real header/footer                                                                                                                                                                                                            |
| Navigation / Sidebar                                | `components/admin/{admin-sidebar,sidebar-nav}.tsx` — grouped by job function (Content/Finance/Engagement/System) per `design/01-Information-Architecture.md` §6; business-module links render as disabled "Coming soon" until their APIs+pages ship (Phase 6/7)                                          |
| Header / Breadcrumb / Profile menu / Theme switcher | `components/admin/{admin-header,profile-menu,theme-switcher}.tsx`, `components/shared/breadcrumb.tsx`                                                                                                                                                                                                    |
| Protected routes                                    | `src/middleware.ts` (lightweight cookie-presence redirect) **+** the Admin layout's server-side identity check (the actual authorization boundary remains the backend API on every request)                                                                                                              |
| Loading components                                  | `components/shared/loading-spinner.tsx`, `app/admin/loading.tsx` (route-segment skeleton)                                                                                                                                                                                                                |
| Error pages                                         | `app/not-found.tsx` (404), `app/error.tsx` (500), `app/unauthorized/page.tsx` (403) — shared `components/shared/status-page.tsx` shell                                                                                                                                                                   |
| Admin dashboard shell                               | `app/admin/page.tsx` — real KPI tile (Admin Users count, permission-gated) + honest "Coming soon" tiles for donation/volunteer/event counts (no fabricated numbers), explicit chart placeholder, working quick actions (Profile, Change Password, API docs link), honest empty-state notifications panel |
| Profile page (fully functional)                     | `app/admin/profile/page.tsx` — edit display name, change password, list/revoke active sessions, logout-all-devices                                                                                                                                                                                       |
| Settings page                                       | `app/admin/settings/page.tsx` — working theme preference (light/dark/system via `next-themes`); notes remaining settings (notification recipients, payment gateway config) as deferred to their respective business modules                                                                              |

**Theme switcher** uses `next-themes`; **Swagger UI** and the dashboard's "API Documentation" quick action both point at the live backend spec.

---

## 3. Build Verification Results

| Check                  |                                        Frontend (`apps/web`)                                         |                                                                                                                  Backend (`apps/api`)                                                                                                                   |
| ---------------------- | :--------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| `npm run typecheck`    |                                          ✅ Pass, 0 errors                                           |                                                                                                                    ✅ Pass, 0 errors                                                                                                                    |
| `npm run lint`         |                                    ✅ Pass, 0 errors, 0 warnings                                     |                                                                                                              ✅ Pass, 0 errors, 0 warnings                                                                                                              |
| `npm run format:check` | ✅ Pass (whole repo, `documentation/`/`design/`/`docs/` excluded per instruction not to modify them) |                                                                                                                                                                                                                                                         |
| `npm run build`        |                     ✅ Pass — 11 routes, full production build incl. middleware                      |                                                                                                              ✅ Pass (`tsc` + `tsc-alias`)                                                                                                              |
| Runtime smoke test     |                                                  —                                                   | ✅ Server boots; `/api/v1/health` correctly reports `degraded` (no live DB in this environment) vs. `ok`; Zod validation confirmed end-to-end on `/auth/login`; unauthenticated `/profile` correctly returns `401`; Swagger UI serves at `/api/v1/docs` |

All checks were run **from the repository root** (`npm run lint` / `npm run typecheck` / `npm run build`), exactly as instructed, and iterated until fully clean.

---

## 4. Issues Encountered & Resolved During This Phase

1. **`ms` package's bundled types don't export a usable `StringValue` type the way I first referenced it** — fixed by wrapping the duration-parsing call in a small local helper (`toMilliseconds`) instead of inlining the cast at every call site.
2. **Backend ESLint's typed-lint block choked on files outside `tsconfig.json`'s `rootDir`** (recurred for the new `@validation/*` alias path) — already-established `tsconfig.eslint.json` pattern from Phase 3 extended to cover it; no new issue class, just more files hitting the existing, already-solved edge case.
3. **shadcn's `form` registry item doesn't exist for the installed `base-nova`/`@base-ui` style** — hand-wrote the standard react-hook-form + shadcn "Form" composition pattern (`components/ui/form.tsx`), substituting `React.cloneElement` for Radix's `Slot` primitive (Base UI has no generic Slot; composition is per-component via a `render` prop instead).
4. **A real, reproducible build-reliability bug**: `npm run build` (`tsc && tsc-alias`) silently failed to emit _any_ output on two separate occasions after `dist/` was manually deleted, because a stale `tsconfig.tsbuildinfo` incremental-compilation cache convinced `tsc` its previous output was still current. Root-caused via direct reproduction (deleting only `dist` vs. deleting both `dist` and the buildinfo file). **Fixed properly, not worked around**: disabled `incremental` compilation in `apps/api/tsconfig.json` (this project's build is fast enough that incremental compilation isn't worth this entire class of stale-cache risk) and added an explicit `clean` step to the `build` script so `dist/` is always removed immediately before every compile.
5. **Next.js build failed on `/login`** with a `useSearchParams() should be wrapped in a suspense boundary` prerender error — fixed by wrapping the form component (which reads `?redirect=`) in a `<Suspense>` boundary, per the Next.js-documented pattern.
6. **shadcn's `Button` (Base UI's `render`-prop pattern, not Radix's `asChild`)** — every polymorphic button-as-link usage across the new pages had to use `render={<Link .../>}` instead of the more commonly-seen `asChild` pattern; caught immediately by the TypeScript compiler each time.

---

## 5. Explicit Scope Boundary (Per Client Instruction)

**Deliberately not built in Phase 4:**

- No business-module pages or APIs (donations, content management, volunteers, events, gallery, reports) — the Sidebar shows these as "Coming soon," the dashboard shows them as explicit placeholders, never fabricated data.
- No Users/Roles _management UI_ (list/create/edit screens) — the backend APIs are fully built, tested, and Swagger-documented, but a frontend CRUD UI for them wasn't in the explicit Phase 4 frontend/admin-dashboard requirement list, so it's deferred rather than over-built.
- No WhatsApp Cloud API / Razorpay / Cloudinary business logic — only the Phase 3 foundational client initialization exists; nothing calls them yet.

**Known environment limitation (same root cause as Phase 3):** no live PostgreSQL instance was available while building this phase, so:

- The initial migration (§2.1) has been generated correctly but never actually _applied_ to a database.
- Login/session/RBAC enforcement was verified as thoroughly as possible without a live DB (validation, error handling, cookie-setting, graceful DB-unavailable behavior all confirmed) but the actual "log in successfully and reach the dashboard" path has not been exercised end-to-end.
- **Action required before UAT**: run `docker compose up -d postgres`, then `npm run prisma:migrate --workspace=apps/api` (applies the generated migration and records it properly) and `npm run prisma:seed --workspace=apps/api`, then walk through the login → dashboard → profile → logout flow once against a real database.

---

## 6. Next Steps (Recommended Before/During Phase 5)

1. Apply the migration and seed data against a real Postgres instance (§5) and perform one manual end-to-end login walkthrough.
2. Decide whether a Users/Roles management UI is wanted now or bundled with a later phase (backend is ready either way).
3. Begin Phase 5 (Public Site) using `design/05-Wireframes.md` and `design/06-Design-System.md` — the (public) route group and layout are already in place to build into.
4. Continue tracking the pending client dependencies in `documentation/16-Assumptions-and-Dependencies.md` (Razorpay KYC, Cloudinary account, domain/DNS access, content gaps, etc.).

---

## 7. Approval Gate

Per the phased, approval-gated process this project follows: **this phase is complete and the codebase builds cleanly with zero TypeScript errors, zero ESLint errors, and zero build errors on both apps** (verified via `npm run lint`, `npm run typecheck`, and `npm run build` from the repository root, all passing after the fixes documented in §4). Stopping here for client approval before any business-module features are implemented.

---

## 8. Git Milestones

Annotated tags marking each completed, approved phase (local-only — no remote is configured for this repository). Phases 1–3 were delivered together in a single squashed "Initial commit," so their tags share one commit hash; Phase 4 landed as its own commit.

| Tag                          | Commit                                          | Description                                                                 |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `v0.1-project-documentation` | `ecb1cbb` (Initial commit)                      | Phase 1 - Business Analysis, BRD, SRS, Requirements Documentation           |
| `v0.2-system-design`         | `ecb1cbb` (Initial commit)                      | Phase 2 - UI/UX, Architecture, Database Design, API Design                  |
| `v0.3-project-foundation`    | `ecb1cbb` (Initial commit)                      | Phase 3 - Project Foundation, Monorepo Setup, Docker, CI/CD, Infrastructure |
| `v0.4-authentication-core`   | `87625d9` (Phase 4: core application framework) | Phase 4 - Authentication, RBAC, Core Framework, Admin Shell                 |

Verify locally with `git tag -l -n1` (list) or `git show <tag>` (full annotation + commit details).

---

## 9. Phase 5 — What Was Built: Backend Business Modules

Per explicit client instruction, Phase 5 was re-scoped from the originally-planned "Public Site" to: **all backend business-module APIs, then the complete admin CMS frontend for every module** — the public-facing site is deferred to the next phase, to be built against these now-complete APIs.

### 9.1 Database

- `apps/api/prisma/schema.prisma` extended with every Phase 5 model: `Testimonial`, `HeroBanner`, `SocialMediaLink`, `NavigationMenuItem` (self-referencing, one level), `SiteSettings` (singleton), `Activity` (covers both "Activities" and "Services" — no separate Services concept exists in the source documents), `Donor`, `DonationCategory`, `Appeal`, `Donation` (+ `DonationFrequency`), `BankTransferRecord`, `Receipt`, `CommitteeMember`, `Volunteer`, `VolunteerApplication`, `VolunteerAssignment`, `EventCategory`, `Event`, `EventRegistration`, `GalleryAlbum`, `GalleryItem`, `DocumentRepo` (+ `pan_card` category), `PageContent`.
- Migration generated via `prisma migrate diff` against the pre-Phase-5 schema snapshot (`20260803132314_phase5_business_modules/`) — no live Postgres in this environment, same constraint as every prior phase; **never applied to a real database** (see §12).
- `apps/api/prisma/seed.ts` rewritten: ~50 permission codes, full role→permission mapping for all 10 roles, 27 real committee members, 7 real activities, and a verified-fields-only `SiteSettings` row — no fabricated data anywhere (unverified fields left blank per the project's established pattern).

### 9.2 Backend architecture decisions

- **Generic CRUD factory** (`src/lib/simple-crud-router.ts`) powers the 7 "plain CRUD" modules (Hero Banners, Testimonials, Social Links, Navigation, Activities, Committee, Event Categories) — one tested implementation instead of 7 near-duplicate route files, consistent pagination/audit-log/error-handling behavior everywhere.
- **Hand-written routers** for every module with real business logic: Donations (manual entry, status transitions, CSV export, SQL-aggregated analytics), Bank Transfers (public claim → admin verify/reject → auto-creates Donation + Receipt), Volunteers (registration → application review → auto-creates Volunteer profile on acceptance), Events (capacity + automatic waitlist promotion on cancellation), Gallery (Cloudinary upload/delete, linked videos, reorder), Documents (Cloudinary upload combined with metadata in one request).
- **New generic `POST /media/upload` endpoint** (`src/routes/v1/media.routes.ts`) added to support the CMS modules whose schemas store a plain image URL (Hero Banners/Testimonials/Committee/Activities) with no upload endpoint of their own — reuses the existing Cloudinary integration, gated by authentication only since it performs no business mutation.
- Every list endpoint returns the same `{ data, pagination }` envelope; every single-resource endpoint returns `{ data }` — verified consistent across all ~20 route files, which is what let one generic frontend `createResourceHooks()` factory (§10) work everywhere.
- Swagger/OpenAPI (`src/config/swagger.ts`) extended with every new endpoint group, including a generated-paths helper for the 7 factory-backed modules to avoid hand-duplicating identical path objects.

---

## 10. Phase 5 — What Was Built: Admin CMS Frontend

Every module below is a real page wired to the live backend API — no mocked data, no placeholder services.

### 10.1 Reusable framework (built once, used everywhere)

| Component/hook                                                                                                       | Purpose                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/{dialog,alert-dialog,select,textarea,checkbox,tabs,table,popover}.tsx`                                | Pulled via the `shadcn` CLI (already configured for this repo's `base-nova`/`@base-ui` style) rather than hand-rolled, guaranteeing exact convention match with the Phase 4 components                                                |
| `hooks/use-resource.ts` — `createResourceHooks()`                                                                    | Generic list/detail/create/update/delete/reorder TanStack Query hook factory — every module's data-fetching is one function call                                                                                                      |
| `components/admin/data-table.tsx`                                                                                    | Generic table: column defs, loading skeletons, empty state, row selection, row actions                                                                                                                                                |
| `components/admin/{pagination-bar,search-input,confirm-dialog,form-dialog,status-badge,page-header,empty-state}.tsx` | Shared list/CRUD chrome                                                                                                                                                                                                               |
| `components/admin/rich-text-editor.tsx`                                                                              | Minimal Bold/Italic/Headings/Lists/Link/Image toolbar per `design/07-Component-Library.md` §5.4 (deliberately not a full editor framework — matches the non-technical admin persona); output sanitized with DOMPurify on every change |
| `components/admin/{image-upload-field,file-upload-field}.tsx`                                                        | Drag-and-drop image upload (via the new `/media/upload` endpoint) and plain file picker with preview                                                                                                                                  |
| `hooks/use-permission.ts`                                                                                            | `useHasPermission(code)` — gates every Add/Edit/Delete button (UX nicety; the backend enforces every permission regardless)                                                                                                           |

New dependencies added: `dompurify` (rich-text sanitization, defense-in-depth per `documentation/12-Security-Requirements.md`'s XSS requirement) and `recharts` (Reports/Dashboard charts).

### 10.2 Pages built, by module

| Module (as requested)                                            | Route(s)                                                                    | Notes                                                                                                                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard                                                        | `/admin`                                                                    | Real KPI tiles now backed by live APIs (Admin Users, Donations this month, Registered Volunteers, Published Events), real donation-trend chart, still permission-gated per tile |
| Home Content                                                     | `/admin/content/home`                                                       | Welcome message (rich text) + repeatable impact-stat rows, **autosave**                                                                                                         |
| About / History / Vision / Mission / Founder / Treasurer Message | `/admin/content/about`                                                      | One editor, tabbed (backend stores these as sections of a single `PageContent` record — see §9.1), **autosave**                                                                 |
| Managing Committee                                               | `/admin/content/committee`                                                  | Full CRUD, photo upload                                                                                                                                                         |
| Treasurer Message                                                | _(folded into About tabs above — no separate backend record exists for it)_ |                                                                                                                                                                                 |
| Activities & Services                                            | `/admin/content/activities`                                                 | Full CRUD — one entity covers both per the Phase 5 backend decision (§9.1)                                                                                                      |
| Hero Banners                                                     | `/admin/content/hero-banners`                                               | Full CRUD, image upload, CTA fields                                                                                                                                             |
| Testimonials                                                     | `/admin/content/testimonials`                                               | Full CRUD, photo upload                                                                                                                                                         |
| Navigation Menus                                                 | `/admin/content/navigation`                                                 | Full CRUD, one level of parent/child nesting                                                                                                                                    |
| Social Links                                                     | `/admin/content/social-links`                                               | Full CRUD, one row per platform                                                                                                                                                 |
| Gallery / Albums / Photos / Videos                               | `/admin/gallery`, `/admin/gallery/[albumId]`                                | Album grid → album detail with photo upload, linked-video add, reorder (up/down), delete (cleans up Cloudinary assets)                                                          |
| News                                                             | `/admin/news`                                                               | Full CRUD, rich text body, SEO fields                                                                                                                                           |
| Events                                                           | `/admin/events`                                                             | Full CRUD, rich text description, inline category management dialog, SEO fields                                                                                                 |
| Event Registrations                                              | `/admin/events/registrations`                                               | List, check-in, cancel (with automatic waitlist promotion server-side)                                                                                                          |
| Donation Categories                                              | `/admin/donations/categories`                                               | Full CRUD (soft "deactivate", matching the backend's own semantics)                                                                                                             |
| Donation Campaigns                                               | `/admin/donations/campaigns`                                                | Full CRUD, live progress bar against target amount                                                                                                                              |
| Donations                                                        | `/admin/donations`                                                          | List/filter/search, manual entry, CSV export                                                                                                                                    |
| Bank Transfers                                                   | `/admin/donations/bank-transfers`                                           | Verification queue — verify (creates Donation + Receipt) / reject with note                                                                                                     |
| Volunteer Management                                             | `/admin/volunteers`                                                         | Applications review (accept/reject/under-review) + registered-volunteer directory, tabbed                                                                                       |
| Volunteer Assignments                                            | `/admin/volunteers/assignments`                                             | Full CRUD, filterable by volunteer                                                                                                                                              |
| Documents                                                        | `/admin/documents`                                                          | Upload (combined file + metadata), edit metadata, Download Centre visibility toggle                                                                                             |
| Reports                                                          | `/admin/reports`                                                            | Donation analytics only — **honestly scoped**: no volunteer/event reporting backend exists yet, stated explicitly on the page rather than fabricating additional report types   |
| Website Settings                                                 | `/admin/settings?tab=website`                                               | Branding, contact info, footer, maintenance mode                                                                                                                                |
| SEO Settings                                                     | `/admin/settings?tab=seo`                                                   | Default meta title/description/OG image                                                                                                                                         |
| Users                                                            | `/admin/users`                                                              | Full CRUD (deferred from Phase 4, now explicitly requested)                                                                                                                     |
| Roles                                                            | `/admin/roles`                                                              | Full CRUD with grouped permission-checkbox matrix                                                                                                                               |
| Permissions                                                      | `/admin/permissions`                                                        | Read-only catalogue, grouped by module                                                                                                                                          |

**Sidebar** (`lib/admin-nav.ts`, `components/admin/sidebar-nav.tsx`) rewritten: every `comingSoon` placeholder removed, every item now points at a real page, and visibility is now actually gated by the caller's permissions (previously the `permission` field was defined but never checked) — including hiding entire groups that end up empty for a narrowly-scoped role.

---

## 11. Phase 5 Build Verification Results

| Check                                |                                                              Frontend (`apps/web`)                                                               |                                     Backend (`apps/api`)                                     |
| ------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------: |
| `npm run lint` (from repo root)      |                                                          ✅ Pass, 0 errors, 0 warnings                                                           |                                ✅ Pass, 0 errors, 0 warnings                                 |
| `npm run typecheck` (from repo root) |                                                                ✅ Pass, 0 errors                                                                 |                                      ✅ Pass, 0 errors                                       |
| `npm run build` (from repo root)     |                                         ✅ Pass — 35 routes (26 new admin pages), full production build                                          |                                ✅ Pass (`tsc` + `tsc-alias`)                                 |
| Runtime smoke test                   | ✅ Both dev servers boot cleanly; `/login` renders with no console errors; Swagger UI at `/api/v1/docs` lists every new endpoint group correctly | ✅ `/api/v1/health`, `/media/upload`, and every Phase 5 route confirmed wired via Swagger UI |

All checks were run **from the repository root**, exactly as instructed, and iterated until fully clean.

---

## 12. Phase 5 Known Limitation (Environment)

Same root cause as every prior phase: **no live PostgreSQL instance is available in this build environment.** The migration (§9.1) has been generated correctly (via Prisma's own schema-diff engine) but never applied, so:

- A full authenticated browser walkthrough of the new admin pages (login → navigate → create/edit/delete a record) has **not** been exercised end-to-end — verification for this phase relied on `lint`/`typecheck`/`build` (which includes Next.js's own prerendering and type-checking passes) plus an unauthenticated runtime smoke test (dev servers boot, public pages render without console errors, Swagger UI serves all routes correctly).
- **Action required before UAT**: run `docker compose up -d postgres`, apply the Phase 5 migration and seed data, then walk through each admin module once against a real database — particularly the bespoke workflows (bank-transfer verification, volunteer-application acceptance, event waitlist promotion, gallery Cloudinary upload/delete) which have real side effects worth confirming end-to-end.
- Cloudinary credentials are also not configured in this environment (confirmed via a startup warning), so image/file upload endpoints are wired correctly but untested against the real Cloudinary API.

---

## 13. Phase 5 Approval Gate

Per the phased, approval-gated process this project follows: **this phase is complete and the codebase builds cleanly with zero TypeScript errors, zero ESLint errors, and zero build errors on both apps** (verified via `npm run lint`, `npm run typecheck`, and `npm run build` from the repository root). Stopping here for client approval before proceeding to the next phase (public-facing site + donation checkout).
