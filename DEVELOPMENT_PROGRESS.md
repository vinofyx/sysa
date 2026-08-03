# Development Progress

## Sai Yadadri Seva Ashram Platform

|                   |                                                 |
| ----------------- | ----------------------------------------------- |
| **Current Phase** | Phase 4 — Core Application Framework (Complete) |
| **Date**          | 2026-08-03                                      |
| **Status**        | Awaiting client approval to proceed to Phase 5  |

---

## 1. Phase Summary

| Phase        | Scope                                                                                                                                                                                                                                                                                                            | Status                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Phase 1**  | Business Analysis & Documentation (BRD, SRS, Functional/Non-Functional Requirements, User Stories, Use Cases, System Modules, Database Requirements, Admin Modules, Roles & Permissions, Technology Stack, Security Requirements, API Requirements, Project Timeline, Risk Analysis, Assumptions & Dependencies) | ✅ Complete — [`documentation/MASTER_PROJECT_PLAN.md`](documentation/MASTER_PROJECT_PLAN.md) |
| **Phase 2**  | Enterprise System Design & UI/UX (Information Architecture, Sitemap, User/Admin Flows, Wireframes, Design System, Component Library, Responsive Design, Animation, Accessibility, SEO Structure, Database ERD, API Architecture, Folder Structure, Deployment Architecture)                                      | ✅ Complete — [`design/SYSTEM_DESIGN.md`](design/SYSTEM_DESIGN.md)                           |
| **Phase 3**  | Project Initialization & Codebase Foundation                                                                                                                                                                                                                                                                     | ✅ Complete                                                                                  |
| **Phase 4**  | Core Application Framework — Authentication, RBAC, Database, Backend APIs, Frontend layouts/shell, Admin Dashboard shell                                                                                                                                                                                         | ✅ Complete — this document                                                                  |
| **Phase 5**  | Core Development — Public Site (Home, About, Activities, Gallery, Events, Contact)                                                                                                                                                                                                                               | ⏳ Not started                                                                               |
| **Phase 6**  | Core Development — Donation Platform (Razorpay integration, checkout, receipts)                                                                                                                                                                                                                                  | ⏳ Not started                                                                               |
| **Phase 7**  | Core Development — Remaining Admin Modules (Content, Donations, Volunteers, Events, Gallery, Reports)                                                                                                                                                                                                            | ⏳ Not started                                                                               |
| **Phase 8**  | Content Population & Bilingual Translation                                                                                                                                                                                                                                                                       | ⏳ Not started                                                                               |
| **Phase 9**  | QA, Security Testing & Accessibility Audit                                                                                                                                                                                                                                                                       | ⏳ Not started                                                                               |
| **Phase 10** | UAT with Client                                                                                                                                                                                                                                                                                                  | ⏳ Not started                                                                               |
| **Phase 11** | Deployment & Go-Live                                                                                                                                                                                                                                                                                             | ⏳ Not started                                                                               |
| **Phase 12** | Post-Launch Stabilization & Handover                                                                                                                                                                                                                                                                             | ⏳ Not started                                                                               |

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
