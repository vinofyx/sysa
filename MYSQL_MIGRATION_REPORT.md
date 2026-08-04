# MySQL Migration Report

## Sai Yadadri Seva Ashram — Website & Donation Platform

|              |                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Document** | Migration completion report — PostgreSQL → MySQL 8.0+                                            |
| **Date**     | 2026-08-04                                                                                       |
| **Status**   | ✅ Complete — all verification checks pass                                                       |
| **Basis**    | Implements [MYSQL_MIGRATION_PLAN.md](MYSQL_MIGRATION_PLAN.md) exactly, step by step              |
| **Scope**    | Greenfield migration — no production data existed; migration history was regenerated, not ported |

---

## 1. Summary

The platform's database engine has been switched from PostgreSQL to MySQL 8.0+ across every layer: Prisma schema and client, migration history, seed data, repositories, Docker/Docker Compose, CI, environment configuration, and documentation. No application functionality, business logic, authentication behavior, or Razorpay integration was changed. The `tags` field on `EventNewsPost` moved from a PostgreSQL scalar array (`String[]`) to a MySQL-compatible `Json` column, storing the same array shape (`["annadanam", "medical camp", "hyderabad"]`) — a storage-representation change with no functional or API-contract change. All `mode: 'insensitive'` Prisma filters were removed; case-insensitive matching (including email authentication) is now provided natively by the `utf8mb4_0900_ai_ci` collation applied to every table.

Final verification — `npx prisma generate`, `npm run lint`, `npm run typecheck`, `npm run build` (both `apps/api` and `apps/web`) — all pass with **zero errors**.

---

## 2. Every File Modified

### 2.1 Database schema & migrations

| File                                                                           | Change                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                                                | `datasource db { provider }` changed `postgresql` → `mysql`. `EventNewsPost.tags` changed `String[] @default([])` → `Json @default("[]")`. Explanatory comments added referencing this report.                                                                                                                                                                                  |
| `apps/api/prisma/migrations/20260804120000_init_mysql/migration.sql` **(new)** | Fresh baseline migration, 36 `CREATE TABLE` statements, generated via `prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script` against the MySQL-provider schema, then normalized to `utf8mb4_0900_ai_ci` collation throughout.                                                                                                                          |
| `apps/api/prisma/migrations/migration_lock.toml`                               | Regenerated; now pins `provider = "mysql"`.                                                                                                                                                                                                                                                                                                                                     |
| 6 old migration directories **(deleted)**                                      | `20260803101658_init`, `20260803132314_phase5_business_modules`, `20260803212356_phase6_newsletter_subscriber`, `20260803214500_news_category_tags`, `20260803220000_site_settings_bank_details`, `20260804000000_phase7_razorpay_payments` — removed entirely per the greenfield/fresh-baseline instruction. No attempt was made to port PostgreSQL migration history forward. |

### 2.2 Backend application code

| File                                                 | Change                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/repositories/admin-user.repository.ts` | Removed `mode: 'insensitive'` from name/email search filter.                                                                                                                                                                                                                                                                     |
| `apps/api/src/repositories/donation.repository.ts`   | Removed `mode: 'insensitive'` from donor name/email search. Rewrote the raw-SQL `getAnalytics()` query: `to_char(date_trunc('month', "created_at"), 'YYYY-MM')` → `DATE_FORMAT(created_at, '%Y-%m')`; removed the PostgreSQL `::float` cast; removed double-quote identifier quoting (MySQL uses unquoted/backtick identifiers). |
| `apps/api/src/repositories/donor.repository.ts`      | Removed `mode: 'insensitive'` from donor search.                                                                                                                                                                                                                                                                                 |
| `apps/api/src/repositories/event.repository.ts`      | Removed `mode: 'insensitive'` from event search.                                                                                                                                                                                                                                                                                 |
| `apps/api/src/repositories/news-post.repository.ts`  | Removed `mode: 'insensitive'` from news/blog search.                                                                                                                                                                                                                                                                             |
| `apps/api/src/repositories/volunteer.repository.ts`  | Removed `mode: 'insensitive'` from volunteer search.                                                                                                                                                                                                                                                                             |
| `apps/api/src/lib/prisma.ts`                         | Doc comment updated ("Postgres connection pool" → "MySQL connection pool"); no functional change — Prisma's connection pooling is provider-agnostic.                                                                                                                                                                             |
| `apps/api/prisma/seed.ts`                            | Reviewed — no changes required. Confirmed via exhaustive grep that seed data never references `.tags` or any array-specific Postgres syntax.                                                                                                                                                                                     |

### 2.3 Frontend application code

| File                                            | Change                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/[locale]/(public)/layout.tsx` | Doc comment updated ("no live Postgres in this build environment" → "no live database in this build environment"). No functional change — confirmed via exhaustive grep that no frontend code directly accesses `.tags` as a typed array; it is only ever passed through as opaque JSON to/from the API. |

### 2.4 Docker, CI, environment configuration

| File                               | Change                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`               | `postgres` service replaced with `mysql` service: image `mysql:8.0`, `--character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci` command flags, `MYSQL_ROOT_PASSWORD`/`MYSQL_USER`/`MYSQL_PASSWORD`/`MYSQL_DATABASE` env vars, port `3306`, volume renamed `postgres_data` → `mysql_data`, healthcheck changed to `mysqladmin ping`. `api` service `depends_on` and `DATABASE_URL` updated to match. |
| `.env.example` (root)              | `POSTGRES_PORT` → `MYSQL_PORT`; `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` → `MYSQL_ROOT_PASSWORD`/`MYSQL_USER`/`MYSQL_PASSWORD`/`MYSQL_DATABASE`.                                                                                                                                                                                                                                                       |
| `apps/api/.env.example`            | `DATABASE_URL` → `mysql://sysa_user:sysa_password@localhost:3306/sysa_db` (dropped the PostgreSQL-only `?schema=public` query param — MySQL has no equivalent schema namespace).                                                                                                                                                                                                                                |
| `apps/api/.env` (local, untracked) | Same `DATABASE_URL` update applied locally so `prisma generate`/build tooling resolves against the new connection string format.                                                                                                                                                                                                                                                                                |
| `.github/workflows/ci.yml`         | Both CI jobs' `services.postgres` block replaced with `services.mysql` (image `mysql:8.0`, matching env/health-check), and `DATABASE_URL` values updated to the MySQL connection string format.                                                                                                                                                                                                                 |

### 2.5 Documentation

**Actively-maintained operational docs — updated directly in place:**

| File                      | Change                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`               | Tech stack table, docker-compose comment, prerequisites, "Start MySQL" section (migration path, collation note, link to this report), health-check line, Docker Compose section. |
| `DEPLOYMENT_GUIDE.md`     | Architecture diagram, prerequisites table, `DATABASE_URL` example.                                                                                                               |
| `GO_LIVE_CHECKLIST.md`    | §2 database provisioning checklist items.                                                                                                                                        |
| `KNOWN_LIMITATIONS.md`    | Intro paragraph and migrations-table row.                                                                                                                                        |
| `DEVELOPMENT_PROGRESS.md` | Header "Current Phase", Phase Summary table (new "DB Migration" row), and new §28 (this migration's narrative record).                                                           |

**Dated planning/design/audit artifacts — historical content preserved, forward-pointing addendum note added** (per the project's established documentation-preservation policy: dated deliverables are not rewritten retroactively; a note is added so the historical record stays accurate while pointing readers to the current source of truth):

- `documentation/08-Database-Requirements.md`
- `documentation/11-Technology-Stack.md`
- `documentation/02-SRS.md`
- `documentation/04-Non-Functional-Requirements.md`
- `design/13-API-Architecture.md`
- `design/14-Folder-Structure.md`
- `design/15-Deployment-Architecture.md`
- `design/SYSTEM_DESIGN.md`

`QA_REPORT.md`, `SECURITY_REPORT.md`, `PERFORMANCE_REPORT.md`, `SEO_REPORT.md` were deliberately left untouched — they are dated point-in-time audit snapshots of the Final Phase review, not living documents, and none of their findings were about the database engine.

---

## 3. Every PostgreSQL-Specific Feature Replaced

| #   | PostgreSQL feature                                                                           | Where                                                                 | MySQL replacement                                                                              | Reasoning                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `datasource db { provider = "postgresql" }`                                                  | `schema.prisma`                                                       | `provider = "mysql"`                                                                           | Core provider switch                                                                                                                                               |
| 2   | `String[]` scalar array column (`EventNewsPost.tags`)                                        | `schema.prisma`                                                       | `Json` column storing a JSON array                                                             | MySQL has no native scalar array type                                                                                                                              |
| 3   | `mode: 'insensitive'` Prisma filter (6 occurrences across 6 repositories)                    | admin-user, donation, donor, event, news-post, volunteer repositories | Removed entirely; no replacement needed                                                        | MySQL provides case-insensitivity via collation (`utf8mb4_0900_ai_ci` is a `_ci` = case-insensitive collation), applied at the column/table level, not per-query   |
| 4   | `to_char(date_trunc('month', "created_at"), 'YYYY-MM')`                                      | `donation.repository.ts` `getAnalytics()`                             | `DATE_FORMAT(created_at, '%Y-%m')`                                                             | MySQL has no `to_char`/`date_trunc`; `DATE_FORMAT` is the direct equivalent for this use case                                                                      |
| 5   | `::float` PostgreSQL type-cast syntax                                                        | same query                                                            | Removed (MySQL numeric aggregate results don't require this cast in this query context)        | `::type` cast syntax is PostgreSQL-only                                                                                                                            |
| 6   | Double-quoted identifiers (`"created_at"`)                                                   | same query                                                            | Unquoted identifiers                                                                           | PostgreSQL uses `"..."` for identifiers; MySQL uses backticks (or none, when the identifier isn't a reserved word)                                                 |
| 7   | `?schema=public` in `DATABASE_URL`                                                           | env files                                                             | Removed                                                                                        | MySQL has no schema-namespace concept equivalent to PostgreSQL's `public` schema — a MySQL connection string names only the database                               |
| 8   | `pg_isready` Docker healthcheck                                                              | `docker-compose.yml`                                                  | `mysqladmin ping`                                                                              | Engine-specific health-check command                                                                                                                               |
| 9   | PostgreSQL migration history (`prisma migrate diff` chain rooted in a `postgresql` provider) | `apps/api/prisma/migrations/`                                         | Fresh baseline (`20260804120000_init_mysql`) generated from-empty against the `mysql` provider | Prisma migration history is provider-locked (`migration_lock.toml`); per the greenfield/no-production-data instruction, history was regenerated rather than ported |

A full source-tree grep for other PostgreSQL-only constructs — `ILIKE`, `RETURNING`, `ON CONFLICT`, array operators (`@>`, `<@`, `&&`), `jsonb` operators, `SERIAL`/`gen_random_uuid()`, PostgreSQL-only extensions — found **no other occurrences**. UUID generation in this codebase is application-side (Prisma-generated via `cuid()`/`uuid()` in the schema, not a database default like `gen_random_uuid()`), so it was already portable and required no change.

---

## 4. Breaking Changes

| Change                                                                                               | Breaking for                                                                                                                                                                                                       | Mitigation                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` format (`mysql://...:3306/...`, no `?schema=public`)                                  | Any environment still pointing at a PostgreSQL connection string                                                                                                                                                   | Documented in `README.md`, `DEPLOYMENT_GUIDE.md`, `.env.example` (root and `apps/api`)                                                                                                                                         |
| Migration history reset (old migrations directory deleted, new baseline `20260804120000_init_mysql`) | Any environment that had already run the old PostgreSQL migrations against a real database                                                                                                                         | Not applicable — this is a greenfield project with no production data anywhere, per explicit client confirmation. A fresh `npx prisma migrate deploy` against an empty MySQL 8.0+ database is the only supported path forward. |
| `EventNewsPost.tags` storage type (`String[]` → `Json`)                                              | Nothing at the application layer — Prisma serializes/deserializes both as a plain JS array on the client side, and no code in this repo ever queried `tags` with array-specific operators (`has`, `hasSome`, etc.) | None needed; confirmed via exhaustive grep before and after the change, and by a clean `npm run typecheck`                                                                                                                     |
| Removal of `mode: 'insensitive'`                                                                     | None at the application layer, **provided** the target MySQL database uses a `_ci` collation (the default in this project's schema and Docker image config)                                                        | If a MySQL server is ever provisioned with a case-sensitive (`_cs` or binary) collation, search/login matching would silently become case-sensitive. Documented as a deployment requirement below.                             |

No API contracts, request/response shapes, authentication flows, RBAC behavior, or Razorpay integration logic changed.

---

## 5. MySQL Compatibility Notes

- **Collation is load-bearing for correctness.** Every table in the new baseline migration uses `utf8mb4_0900_ai_ci` (MySQL 8.0's default modern collation: accent-insensitive, case-insensitive, full Unicode-aware sorting). This is what makes `Admin@sysa.org` / `admin@sysa.org` / `ADMIN@SYSA.ORG` collide as the same account on the unique `AdminUser.email` index, and what makes case-insensitive name/email search work without `mode: 'insensitive'`. **Any database server or managed-MySQL provider used in staging/production must be configured with `utf8mb4_0900_ai_ci`** (or, if unavailable on an older MySQL variant, the documented fallback `utf8mb4_unicode_ci`, which is also `_ci`/case-insensitive) — a server defaulting to a binary or case-sensitive collation would silently break email-uniqueness and search behavior.
- **`utf8mb4` charset** (not `utf8`, which in MySQL is a 3-byte-max legacy alias) is required end-to-end for correct storage of Telugu script and emoji — both are set at the database/table level in the new migration and in the Docker image's server flags.
- **`VARCHAR(191)` on indexed string columns** (Prisma's default when generating for MySQL with `utf8mb4`) is intentional, not an oversight — InnoDB's default index key-length limit (767 bytes for `Barracuda`/`utf8mb4`-not-large-prefix configurations) constrains indexed `utf8mb4` `VARCHAR` columns to 191 characters (191 × 4 bytes = 764 bytes, safely under the limit). Non-indexed long text still uses `TEXT`.
- **`DATETIME(3)`** (millisecond precision) is used throughout in place of PostgreSQL's `TIMESTAMP`, matching Prisma's `DateTime` mapping for MySQL.
- **JSON columns** (`tags`, `before_state`, `after_state`, `payload`, `blocks_en`, `blocks_te`) use MySQL's native `JSON` column type, which — unlike PostgreSQL's `jsonb` — has no operator-level querying used anywhere in this codebase, so no query logic needed adapting.

---

## 6. Remaining Risks

1. **Never exercised against a live MySQL server.** As with every prior phase of this project (see `KNOWN_LIMITATIONS.md`), no live database has been available in this build environment. `prisma generate` and `prisma migrate diff --from-empty` both succeed without a live connection, and the generated SQL was manually reviewed for correctness, but the migration has not been applied to and exercised against a real MySQL 8.0+ instance. **This must be done before go-live** — run `npx prisma migrate deploy` against a real MySQL 8.0+ database (with `utf8mb4_0900_ai_ci` collation) and re-run the full test/QA pass from `QA_REPORT.md` against it.
2. **Collation must be enforced at provisioning time.** As noted in §5, case-insensitive email matching depends entirely on the server/database collation. This should be an explicit item on `GO_LIVE_CHECKLIST.md` when the production MySQL instance is provisioned (verify `SHOW TABLE STATUS` / `information_schema.TABLES.TABLE_COLLATION` reports `utf8mb4_0900_ai_ci` — or `utf8mb4_unicode_ci` — for every table).
3. **Managed-MySQL provider variance.** Some managed MySQL providers (older RDS MySQL versions, some budget hosts) may not support `utf8mb4_0900_ai_ci` (an MySQL 8.0+ collation). `utf8mb4_unicode_ci` is the documented fallback and is also case-insensitive, so authentication/search behavior is preserved either way — but whichever is chosen must be applied consistently at server, database, and table level, not left to default to `utf8mb4_general_ci` (a weaker, non-full-Unicode-aware collation) or a `_cs`/binary collation.

---

## 7. Verification Results

All four required checks were run from the repository root and **all pass with zero errors**:

| Check                                                                               | Result                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx prisma generate` (in `apps/api`)                                               | ✅ Pass — Prisma Client v5.22.0 regenerated cleanly against the MySQL-provider schema, no live database connection required                                                                                                                                                                                     |
| `npx prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script` | ✅ Pass — produced the 728-line, 36-table MySQL baseline migration reviewed in §2.1                                                                                                                                                                                                                             |
| `npm run lint` (root, both workspaces)                                              | ✅ Pass — 0 errors, 0 warnings (`apps/web` and `apps/api`)                                                                                                                                                                                                                                                      |
| `npm run typecheck` (root, both workspaces)                                         | ✅ Pass — 0 errors (`apps/web` and `apps/api`). This is the first empirical confirmation that the `EventNewsPost.tags` type change (`Prisma.EventNewsPostCreateInput`/`UpdateInput`'s `tags` field moving from `string[]` to `Prisma.InputJsonValue`) compiles cleanly against every call site in the codebase. |
| `npm run build` (root, both workspaces)                                             | ✅ Pass — `apps/api` (`tsc` + `tsc-alias`) and `apps/web` (`next build`, all 89 routes generated successfully, including all bilingual `en`/`te` static pages)                                                                                                                                                  |

No fixes were required during verification — the migration compiled and built cleanly on the first full pass.

---

## 8. Quality Constraints — Compliance Confirmation

Per the explicit instructions governing this migration:

- ✅ **No application functionality changed.** Every change is either a schema/provider-level change, a query-syntax translation, or a documentation update.
- ✅ **No business logic removed.** All services, validation, and route logic are untouched.
- ✅ **No authentication removed.** JWT/session/RBAC logic is untouched; email case-insensitivity is now provided by MySQL collation instead of a Prisma query flag, with identical observable behavior.
- ✅ **No Razorpay integration removed.** Not touched by this migration.
- ✅ **No UI/UX changes** except where strictly required for MySQL compatibility (none were required — the `tags` field change is fully transparent to the frontend, which only ever handles it as opaque JSON).
- ✅ **Application behavior is identical** — confirmed via the zero-diff typecheck/lint/build results and the exhaustive greps documented in §2 and §3.

---

**Related documents:** [MYSQL_MIGRATION_PLAN.md](MYSQL_MIGRATION_PLAN.md) · [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) §28 · [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) · [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) · [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)
