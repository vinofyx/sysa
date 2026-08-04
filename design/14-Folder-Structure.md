# Folder Structure
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Note** | Structural specification only — **no code is generated**. This defines the project layout the Frontend/Backend Architects will scaffold during the build phase, consistent with the stack chosen in [11-Technology-Stack.md](../documentation/11-Technology-Stack.md) (Next.js + Node.js/Express + PostgreSQL, monorepo-friendly). |

> **Update (2026-08-04):** by explicit client decision, the implemented platform's database is **MySQL 8.0+**, not PostgreSQL. See [MYSQL_MIGRATION_REPORT.md](../MYSQL_MIGRATION_REPORT.md). The folder structure itself (`apps/api/prisma/`, monorepo layout) is unaffected — Prisma abstracts the provider difference below the schema/migrations layer.

---

## 1. Repository Strategy

**Recommended: a single monorepo** (`sai-yadadri-platform/`) containing both frontend and backend, rather than two separate repositories.

| Consideration | Monorepo | Polyrepo |
|---|---|---|
| Team size (small, per non-profit budget) | ✅ Simpler coordination | ❌ Overhead of cross-repo versioning |
| Shared types (e.g., Donation shape used by both API and Admin UI) | ✅ Direct sharing via a `packages/shared` module | ❌ Requires publishing an internal package |
| CI/CD simplicity | ✅ One pipeline | ❌ Two pipelines to keep in sync |
| **Decision** | **Monorepo selected** | — |

## 2. Top-Level Structure

```
sai-yadadri-platform/
├── apps/
│   ├── web/                    # Next.js public site + admin dashboard
│   └── api/                    # Node.js/Express backend API
├── packages/
│   ├── shared-types/           # Shared TypeScript types (Donation, Donor, Role, etc.)
│   ├── ui/                     # Shared design-system component library
│   └── config/                 # Shared ESLint/TSConfig/Prettier configs
├── infrastructure/
│   ├── docker/                 # Dockerfiles, docker-compose for local dev
│   ├── ci/                     # CI/CD pipeline definitions
│   └── terraform/ (optional)   # Infra-as-code, if adopted per 15-Deployment-Architecture.md
├── docs/                       # (existing) — source client documents, untouched
├── documentation/              # (existing) — Phase 1 deliverables, untouched
├── design/                     # (existing) — Phase 2 deliverables, this document
├── .github/workflows/          # CI/CD pipeline (if GitHub Actions per 11-Technology-Stack.md)
├── package.json                # Root workspace config
├── turbo.json / nx.json        # Monorepo build orchestration (Turborepo or Nx)
└── README.md
```

## 3. Frontend Structure (`apps/web/`)

```
apps/web/
├── app/                                  # Next.js App Router
│   ├── [locale]/                         # en / te dynamic segment (per 02-Sitemap.md locale strategy)
│   │   ├── (public)/                     # Route group — public site
│   │   │   ├── page.tsx                  # Home
│   │   │   ├── about/page.tsx
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx              # Activities index
│   │   │   │   └── [slug]/page.tsx       # Activity detail
│   │   │   ├── donate/
│   │   │   │   ├── page.tsx              # Donation Categories
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   ├── thank-you/page.tsx
│   │   │   │   └── history/page.tsx      # Auth-gated
│   │   │   ├── donors/page.tsx           # Donor Corner
│   │   │   ├── gallery/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [album]/page.tsx
│   │   │   ├── news/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── volunteer/page.tsx
│   │   │   ├── transparency/page.tsx
│   │   │   ├── appeals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── privacy-policy/page.tsx
│   │   │   └── terms/page.tsx
│   │   └── layout.tsx                    # Locale-aware root layout (header/footer)
│   ├── admin/                            # Admin Dashboard (not locale-prefixed — internal tool, single language for now)
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── content/
│   │   │   ├── home/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── activities/page.tsx
│   │   │   ├── appeals/page.tsx
│   │   │   └── contact/page.tsx
│   │   ├── donations/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── donors/page.tsx
│   │   ├── volunteers/page.tsx
│   │   ├── gallery/page.tsx
│   │   ├── events/page.tsx
│   │   ├── committee/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── users/page.tsx
│   │   ├── audit-log/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx                    # Admin shell (sidebar nav per 01-Information-Architecture.md §6)
│   └── api/                              # Next.js route handlers ONLY if used as a BFF layer;
│                                          # primary business API lives in apps/api (see §4)
├── components/
│   ├── public/                           # Public-site component family (per 07-Component-Library.md)
│   │   ├── layout/ (StickyHeader, Footer, MobileMenuDrawer, LanguageSwitcher, Breadcrumb)
│   │   ├── marketing/ (HeroBanner, StatCard, TestimonialCarousel, ActivityCard, EventCard)
│   │   ├── donation/ (QuickDonateWidget, DonationCategoryCard, AmountChipSelector,
│   │   │              DonationStepIndicator, PaymentMethodTabs, DonationSummaryCard)
│   │   └── forms/ (TextInput, TextArea, Select, FileUpload, CaptchaWidget)
│   ├── admin/                            # Admin component family
│   │   ├── layout/ (AdminSidebarNav, AdminHeader)
│   │   ├── data/ (DataTable, KPITile, StatusPill, AuditLogRow)
│   │   └── editors/ (RichTextEditor, ImageUploadZone)
│   └── shared/                           # Cross-cutting (Button, Modal, Toast, Badge, EmptyState)
├── lib/
│   ├── api-client/                       # Typed fetch wrappers calling apps/api
│   ├── i18n/                             # Locale dictionaries (en.json, te.json) + helpers
│   ├── auth/                             # Client-side auth/session helpers
│   └── analytics/                        # Analytics wrapper
├── styles/
│   ├── tokens.css                        # Design tokens from 06-Design-System.md
│   └── globals.css
├── public/
│   ├── fonts/                            # Self-hosted Poppins/Inter/Noto Sans Telugu
│   └── images/                           # Static brand assets (logo, favicon)
├── middleware.ts                         # Locale detection/redirect, admin route protection
├── next.config.js
└── package.json
```

## 4. Backend Structure (`apps/api/`)

```
apps/api/
├── src/
│   ├── routes/                           # Route handlers only (Presentation Layer, per 13-API-Architecture.md)
│   │   ├── public/
│   │   │   ├── content.routes.ts
│   │   │   ├── donations.routes.ts
│   │   │   ├── volunteers.routes.ts
│   │   │   ├── contact.routes.ts
│   │   │   └── webhooks.routes.ts
│   │   └── admin/
│   │       ├── auth.routes.ts
│   │       ├── content.routes.ts
│   │       ├── donations.routes.ts
│   │       ├── donors.routes.ts
│   │       ├── volunteers.routes.ts
│   │       ├── gallery.routes.ts
│   │       ├── events.routes.ts
│   │       ├── committee.routes.ts
│   │       ├── documents.routes.ts
│   │       ├── reports.routes.ts
│   │       ├── users.routes.ts
│   │       ├── audit-log.routes.ts
│   │       └── settings.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts            # JWT verification
│   │   ├── rbac.middleware.ts            # Permission checks (10-Roles-and-Permissions.md)
│   │   ├── rate-limit.middleware.ts
│   │   ├── validate.middleware.ts        # Schema validation
│   │   ├── audit-log.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── services/                         # Business logic (Service Layer)
│   │   ├── donation.service.ts
│   │   ├── content.service.ts
│   │   ├── volunteer.service.ts
│   │   ├── notification.service.ts
│   │   ├── report.service.ts
│   │   ├── auth.service.ts
│   │   └── reconciliation.service.ts     # Webhook fallback polling job (13-API-Architecture.md §5)
│   ├── repositories/                     # Data Access Layer
│   │   ├── donation.repository.ts
│   │   ├── donor.repository.ts
│   │   ├── committee.repository.ts
│   │   ├── event.repository.ts
│   │   ├── gallery.repository.ts
│   │   ├── volunteer.repository.ts
│   │   ├── document.repository.ts
│   │   ├── user.repository.ts
│   │   └── audit-log.repository.ts
│   ├── models/ or entities/              # ORM entity/schema definitions (per 12-Database-ERD.md)
│   ├── integrations/
│   │   ├── razorpay/                     # Payment gateway client + webhook signature verification
│   │   ├── storage/                      # Cloudinary/S3 client
│   │   ├── email/                        # Transactional email client
│   │   └── whatsapp/                     # wa.me link helper (Phase 1) / Cloud API client (Phase 2)
│   ├── jobs/                             # Scheduled jobs (donation reconciliation, backup triggers)
│   ├── utils/
│   ├── config/                           # Environment config loader
│   └── server.ts                         # App entrypoint
├── migrations/                           # Versioned DB migrations (per 08-Database-Requirements.md §7)
├── seeds/                                # Seed data (donation categories, initial admin, committee roster)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

## 5. Shared Packages

```
packages/shared-types/
└── src/
    ├── donation.types.ts
    ├── donor.types.ts
    ├── volunteer.types.ts
    ├── content.types.ts
    ├── role-permission.types.ts
    └── index.ts

packages/ui/
└── src/
    └── tokens/                           # Design tokens as a single shared source
        (colors.ts, typography.ts, spacing.ts — generated from 06-Design-System.md)
```

## 6. Folder Structure Principles

| Principle | Applied How |
|---|---|
| Mirror the architecture layers physically | `routes/ → middleware/ → services/ → repositories/` folder order matches the layered diagram in [13-API-Architecture.md §2](13-API-Architecture.md#2-layered-architecture) exactly — a new developer can navigate the codebase by re-reading that diagram |
| Public vs. Admin separation everywhere | Both frontend (`app/[locale]/(public)` vs `app/admin`) and backend (`routes/public` vs `routes/admin`) keep the two surfaces physically separate, reflecting their very different RBAC/security postures |
| Feature-then-type, not type-then-feature, at the top level | Grouping by module (donations, volunteers, committee) inside each layer keeps related files discoverable together rather than scattered across generic `controllers/`, `views/` buckets |
| No business logic in route handlers or React components | Business rules live only in `services/` (backend) — enforced via code review, not just convention, per NFR-MAINT-01 in [04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md) |
| Documentation folders remain untouched by the codebase | `docs/`, `documentation/`, `design/` sit alongside `apps/`/`packages/` at the repo root, never inside build output paths |

## 7. Environment & Secrets File Convention

```
apps/api/.env.example        # Committed — documents required variables, no real values
apps/api/.env.local          # Gitignored — local dev secrets
apps/web/.env.example
apps/web/.env.local
```
Actual production secrets (Razorpay keys, DB credentials, email API keys) live in the hosting platform's managed secret store, never in the repository — per SEC-PAY-03 in [12-Security-Requirements.md](../documentation/12-Security-Requirements.md).

---
**Related Documents:** [../documentation/11-Technology-Stack.md](../documentation/11-Technology-Stack.md) · [13-API-Architecture.md](13-API-Architecture.md) · [07-Component-Library.md](07-Component-Library.md) · [15-Deployment-Architecture.md](15-Deployment-Architecture.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
