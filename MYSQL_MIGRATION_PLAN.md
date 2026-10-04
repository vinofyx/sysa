# MySQL Migration Plan

## Sai Yadadri Seva Ashram Platform — PostgreSQL → MySQL

|            |                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Analysis only. No code has been modified.** Awaiting approval to implement.                                                                                                                          |
| **Date**   | 2026-08-04                                                                                                                                                                                             |
| **Method** | Full source review of `api/prisma/schema.prisma`, all 6 migrations, every repository file, Docker/CI/env configuration, and every documentation file referencing PostgreSQL                            |
| **Target** | MySQL 8.0+ (assumed — MySQL 8 is the only version with mature native JSON support, window functions, and CTEs; MySQL 5.7 is not recommended and is not what this plan targets unless stated otherwise) |

---

## 0. Executive Summary

This is a **moderate-risk, well-contained** migration. The schema was built entirely through Prisma's ORM layer with almost no direct PostgreSQL-specific SQL in application code — only **one** raw query and **one** scalar-array field are genuinely PostgreSQL-only constructs. The dominant risk is not schema complexity, it's a **single, repeated Prisma query option** (`mode: 'insensitive'`) used in 10 places across 6 files, which is silently PostgreSQL/MongoDB-only and will throw a runtime error against MySQL if not removed.

| Category                                                     |                                  Finding count                                   | Severity                                               |
| ------------------------------------------------------------ | :------------------------------------------------------------------------------: | ------------------------------------------------------ |
| Prisma schema fields requiring a type change                 |                            1 (`String[]` tags array)                             | High — no MySQL equivalent                             |
| Query options that break at runtime on MySQL                 |                 10 occurrences, 6 files (`mode: 'insensitive'`)                  | **Critical** — these are not silent; they throw        |
| Raw SQL requiring rewrite                                    |               1 query (`donation.repository.ts` monthly analytics)               | Medium                                                 |
| Migration history                                            | 6 migrations, all hand-written SQL, `migration_lock.toml` pinned to `postgresql` | Must be reset, not incrementally ported                |
| Docker/CI/env files referencing Postgres                     |                                     6 files                                      | Low effort, mechanical                                 |
| Documentation files referencing PostgreSQL                   |                                     12 files                                     | Low priority, non-blocking                             |
| Behavioral differences requiring a decision (not a code bug) |             Collation/case-sensitivity, transaction isolation level              | Medium — needs explicit choices, not just find-replace |

**No `pg` npm package, no PostgreSQL extensions (`pg_trgm`, `uuid-ossp`, `citext`), no full-text search, no GIN/GiST indexes, no partial indexes, and no `@db.Uuid` native type are used anywhere in this codebase.** This significantly narrows the actual migration surface compared to a typical Postgres→MySQL migration.

---

## 1. Prisma Changes

### 1.1 `datasource` block

`api/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

→

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

This single line change is what actually switches Prisma's query engine and SQL dialect — but it cannot be made in isolation; every finding in §2–§10 below is a consequence of this one line.

### 1.2 `migration_lock.toml`

`api/prisma/migrations/migration_lock.toml` currently contains:

```toml
provider = "postgresql"
```

Prisma uses this file to **refuse to apply migrations** if the schema's provider doesn't match the lock file. It must be regenerated for `mysql`. Prisma does not support mixing PostgreSQL-authored and MySQL-authored SQL migrations in one history — see §3 (Migration Strategy) for the recommended reset approach.

### 1.3 `@prisma/client` / `prisma` packages

No version change needed — Prisma (`^5.22.0`, confirmed in `api/package.json`) has supported the `mysql` provider since Prisma 2.x. `npx prisma generate` will regenerate the client against the new provider's type mappings (this is also when several of the type differences in §2 get surfaced as generate-time or type-check-time errors, which is useful — many mistakes will be caught by `npm run typecheck` before ever touching a database).

### 1.4 Prisma schema field-level annotations requiring change

| Current (Postgres)                                                           | MySQL equivalent                                                                                                                                                                                                         | Where                                                                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `@db.Decimal(12, 2)`                                                         | Same — `Decimal` + `@db.Decimal(12, 2)` is valid on MySQL, no change needed                                                                                                                                              | `Donation.amount`, `BankTransferRecord.amount`, `Appeal.targetAmount`/`raisedAmountCache`                                 |
| `@db.Decimal(9, 6)`                                                          | Same, no change needed                                                                                                                                                                                                   | `SiteSettings.mapLatitude`/`mapLongitude`                                                                                 |
| `@db.Date`                                                                   | Same — MySQL has a native `DATE` type, no change needed                                                                                                                                                                  | `Appeal.startDate`/`endDate`, `EventNewsPost.eventDate`, `DocumentRepo.publishedDate`, `VolunteerAssignment.assignedDate` |
| `String[]` (scalar array, no `@db.` annotation shown but implied array type) | **No MySQL equivalent — must be redesigned.** See §2.1                                                                                                                                                                   | `EventNewsPost.tags`                                                                                                      |
| `Json`                                                                       | Same — MySQL 5.7.8+/8.0 has native `JSON`, Prisma maps `Json` to it directly, no annotation change needed                                                                                                                | `AuditLog.beforeState`/`afterState`, `PageContent.blocksEn`/`blocksTe`, `PaymentWebhookEvent.payload`                     |
| `enum` declarations (19 total)                                               | Prisma maps Prisma `enum` to MySQL's native inline `ENUM(...)` column type automatically — no schema change needed, but the generated migration DDL differs completely from Postgres's `CREATE TYPE` approach (see §2.3) | All 19 enums                                                                                                              |
| `String @id @default(uuid())`                                                | Same declaration works, but Prisma will generate a different underlying column type for MySQL (see §8)                                                                                                                   | Every model's `id` field                                                                                                  |

**Net result for `schema.prisma` itself**: change 1 line (`provider`), redesign 1 field (`tags`), remove 0 lines that were relying on a Postgres-only column type (there are none — the schema was written portably apart from the one array field). This is a small, surgical diff for a 55-model schema.

---

## 2. Database Schema Changes

### 2.1 `EventNewsPost.tags String[] @default([])` — breaking, needs redesign

This is the **one field in the entire schema with no MySQL equivalent**. PostgreSQL scalar arrays are a Postgres-only feature; MySQL has no comparable native array column type.

Three redesign options, in order of recommendation:

| Option                           | Description                                                                                   | Trade-off                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. JSON column** (recommended) | `tags Json @default("[]")`, store as a JSON array of strings, e.g. `["annadanam", "goshala"]` | Closest to current behavior with minimal application-code change (repository/service layer already receives/returns `string[]` at the TypeScript boundary — only the Prisma field type and the (de)serialization at the repository layer change). Cannot be indexed/filtered by individual tag value at the SQL level without MySQL 8's `JSON_CONTAINS()`/generated-column tricks. |
| **B. Comma-separated string**    | `tags String @default("")`, e.g. `"annadanam,goshala"`                                        | Simplest migration, but loses any structure — filtering by tag requires `LIKE '%,tag,%'` string matching, fragile and slow. Not recommended for anything beyond a quick stopgap.                                                                                                                                                                                                   |
| **C. Normalized join table**     | New `Tag` model + `NewsPostTag` join table                                                    | Most "correct" relational design, enables real indexed tag queries and a future tag-management UI — but the largest change: new model, new migration, new repository methods, and a data-migration script to explode existing comma/array values into rows.                                                                                                                        |

**Recommendation**: **Option A (JSON column)**. The current usage (`api/src/validation/news-post.schema.ts`'s `tags: z.array(z.string().max(50)).max(20).default([])`, and the repository/service layer treating it as a plain `string[]`) already treats tags as an opaque array with no relational querying against individual tags anywhere in the codebase — no route filters news by a single tag value at the database level (`listNewsPostsQuerySchema` filters by `category`, a separate plain string field, not by tag). A JSON column preserves the exact current external behavior (array in, array out) with the smallest application-code surface area to touch: `news-post.repository.ts`'s `create`/`update`/`findMany` mapping, and none of the validation, service, or route layers need to change at all since they only see a `string[]` before/after the repository boundary.

### 2.2 Column type mapping differences (informational — Prisma handles these automatically on `generate`, listed for completeness/review)

| Prisma type                                        | PostgreSQL column                 | MySQL column                                                                                                                                                                                                                                                                                                                                                                                                                             | Notes                                                                             |
| -------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `String` (no length)                               | `TEXT`                            | `VARCHAR(191)` for indexed/unique/id fields, `TEXT` otherwise                                                                                                                                                                                                                                                                                                                                                                            | See §8 (UUID) and §5 (Indexes) for why 191 specifically                           |
| `String @db.Text` type equivalent for long content | n/a (all `TEXT` in PG by default) | Fields like `PageContent.blocksEn`/rich-text bodies that are `Json` already, or plain `String` for things like `descriptionEn` — review whether any long-text `String` field needs an explicit `@db.Text` in MySQL if it exceeds ~191 chars AND needs to be unique/indexed (none currently are both long-text and unique, so no explicit annotation is expected to be needed, but this must be verified per-field during implementation) |
| `Boolean`                                          | `BOOLEAN` (alias for `boolean`)   | `TINYINT(1)`                                                                                                                                                                                                                                                                                                                                                                                                                             | Prisma abstracts this identically at the client level; no application code change |
| `Int`                                              | `INTEGER`                         | `INT`                                                                                                                                                                                                                                                                                                                                                                                                                                    | No change                                                                         |
| `DateTime`                                         | `TIMESTAMP(3)`                    | `DATETIME(3)`                                                                                                                                                                                                                                                                                                                                                                                                                            | See §9 for the more important semantic difference (timezone handling)             |

### 2.3 Enum representation

PostgreSQL migrations (current): each enum becomes a standalone `CREATE TYPE "EnumName" AS ENUM (...)`, then columns reference it by type name (visible throughout every migration file, e.g. `"payment_method" "PaymentMethod" NOT NULL`).

MySQL migrations (after switch): Prisma inlines the enum directly into the column definition, e.g. `` `payment_method` ENUM('upi','card','netbanking','wallet','bank_transfer_manual','cash','cheque') NOT NULL ``. No separate type object exists in MySQL.

**Practical impact**: none at the Prisma Client / TypeScript level — `PaymentMethod` remains a generated TS union type either way, and every route/service/repository that references these enums (e.g. `paymentMethodSchema` in `api/src/validation/donation.schema.ts`) needs **zero changes**. The only consumer of the raw DDL difference is the migration SQL itself, entirely regenerated per §3.

### 2.4 Collation and case-sensitivity — a real behavioral change, not just syntax

PostgreSQL's default `text`/`varchar` comparison is **case-sensitive** and **byte-exact** (`C` collation family unless explicitly configured otherwise, which this project doesn't). MySQL's commonly-used default collations (`utf8mb4_general_ci`, `utf8mb4_0900_ai_ci` on MySQL 8) are **case-insensitive by default** (the `_ci` suffix — "case insensitive").

This has two concrete, non-obvious consequences for this schema:

1. **Unique constraints change meaning.** `Donor.email @unique` and `AdminUser.email @unique` currently allow `donor@example.com` and `Donor@Example.com` to coexist as two distinct rows in Postgres (case-sensitive comparison). Under MySQL's default case-insensitive collation, these would collide as a duplicate-key violation. **This is very likely the desired behavior for email uniqueness** (most systems want case-insensitive email matching) and is arguably a latent correctness improvement, not a regression — but it is a behavior change that should be explicitly decided and documented, not discovered by surprise. Recommend: keep the default case-insensitive collation for these columns (do nothing special) and add a normalization step (lowercase the email before every lookup/insert) at the application layer regardless, for defense-in-depth consistency across both databases.
2. **Text search (`contains`) semantics change.** See §6 (Full-Text Search) and the `mode: 'insensitive'` finding in §14 — MySQL's default collation already does case-insensitive substring matching without any special query option, which is precisely why Prisma doesn't support `mode: 'insensitive'` for MySQL: it's redundant, not absent. The **fix is a deletion**, not a replacement.

### 2.5 Telugu-language collation

This application stores and sorts bilingual content (`nameTe`, `titleTe`, `descriptionTe`, `bioTe`, etc. — every `*Te` field across the CMS models). MySQL's `utf8mb4_general_ci` collation does **not** apply proper Unicode collation rules to non-Latin scripts (it essentially falls back to binary-ish ordering for characters it doesn't have specific rules for). **Recommendation**: use `utf8mb4_unicode_ci` (MySQL 5.7-compatible) or `utf8mb4_0900_ai_ci` (MySQL 8's newer, more accurate Unicode collation) as the database/table default collation, set via `DATABASE_URL` connection parameters or Prisma's schema-level (not currently configurable per-field in this schema, so this is a database/connection-level setting, applied once at database creation time — see §12 Docker changes for where this gets configured).

---

## 3. Migration Strategy

### 3.1 Why the existing 6 migrations cannot be "ported"

Prisma's migration history is provider-specific by design — `migration_lock.toml` enforces this, and the actual SQL in each of the 6 existing migrations (`20260803101658_init` through `20260804000000_phase7_razorpay_payments`) is PostgreSQL DDL syntax (double-quoted identifiers, `CREATE TYPE`, Postgres-specific `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` syntax variations) that MySQL's SQL parser will reject outright.

### 3.2 Recommended approach: fresh baseline migration

1. Switch `provider` in `schema.prisma` to `mysql` (§1.1) and make the `tags` field change (§2.1).
2. **Delete** the entire `api/prisma/migrations/` directory (all 6 folders + `migration_lock.toml`).
3. Run `npx prisma migrate dev --name init_mysql` against a real, empty MySQL 8 database. This generates **one new, MySQL-native migration** representing the entire current schema state — equivalent in effect to all 6 Postgres migrations combined, but expressed in correct MySQL DDL.
4. Review the generated SQL by hand (same diligence this project has applied to every hand-written Postgres migration to date) before committing it.
5. This becomes the new starting point for all future schema changes — the project's Postgres migration history is retired, not deleted from git history (it remains visible via `git log`), just no longer the active migration chain.

**Why not try to keep per-phase migration boundaries (6 MySQL migrations instead of 1)?** Because Prisma's `migrate dev` diffs against the _current_ database state, not against the old Postgres migration files — there is no tooling support for "replay this specific historical diff, but in MySQL syntax." Attempting to hand-craft 6 equivalent MySQL migrations one-by-one is significantly more manual, error-prone work for zero practical benefit (nothing in this project's operational history depends on being able to `migrate deploy` to an intermediate historical schema state — every real deployment target starts from empty).

### 3.3 Data migration (if a live PostgreSQL database with real data already exists)

**As of this plan's writing, per KNOWN_LIMITATIONS.md, no live PostgreSQL database has ever existed for this project in any environment it has been built in — there is currently no production data to migrate.** This section is written for completeness / future-proofing, in case this plan is executed after real data has accumulated:

1. Export data from PostgreSQL: `pg_dump --data-only --column-inserts` (produces portable `INSERT` statements) rather than a binary dump, since binary Postgres dumps cannot be loaded into MySQL directly.
2. A dedicated ETL step is required, not a raw SQL replay — column-level differences (the `tags` array, boolean representation, enum value casing) mean the exported `INSERT` statements cannot be fed to MySQL as-is. Recommend a small one-off Node.js script using `@prisma/client` against **both** a PostgreSQL connection and a MySQL connection: read every table via the Postgres Prisma client, transform (especially `tags: string[]` → `JSON.stringify(tags)`), write via the MySQL Prisma client. This reuses the exact same TypeScript models/types already defined for both ends and avoids hand-writing per-table SQL transformation scripts.
3. Sequence/ordering: respect foreign-key dependency order (Roles → Permissions → AdminUsers → everything else; Donors → Donations → Receipts; etc.) — the same dependency graph already implicit in `prisma/seed.ts`'s insertion order is a reasonable guide.
4. **Do not attempt an in-place `ALTER`-based migration** (there is no tool that converts a live Postgres cluster to a live MySQL cluster in place) — this is fundamentally an export/transform/import operation, planned as a maintenance-window activity with the application offline or in read-only mode for its duration.

### 3.4 Rollback plan

Keep the PostgreSQL `docker-compose.yml` service definition and `.env` values available (e.g. in a feature branch or clearly labeled backup files) until the MySQL migration has been running successfully in production for an agreed burn-in period. Since Prisma's migration history is being reset (§3.2), reverting is not a simple `git revert` — it means redeploying the pre-migration commit, which still has its original, intact Postgres migration history and would work against a restored Postgres backup.

---

## 4. SQL Syntax Differences

### 4.1 The one raw query that must be rewritten

`api/src/repositories/donation.repository.ts`, inside `getAnalytics()`:

```ts
prisma.$queryRaw<{ month: string; total: number }[]>`
  SELECT to_char(date_trunc('month', "created_at"), 'YYYY-MM') AS month,
         COALESCE(SUM("amount"), 0)::float AS total
  FROM "donation"
  WHERE "status" = 'completed'
    ${dateFrom ? Prisma.sql`AND "created_at" >= ${dateFrom}` : Prisma.empty}
    ${dateTo ? Prisma.sql`AND "created_at" <= ${dateTo}` : Prisma.empty}
  GROUP BY 1
  ORDER BY 1
`;
```

Three Postgres-specific constructs in this one query:

| Postgres construct                                                               | MySQL equivalent                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `to_char(date_trunc('month', "created_at"), 'YYYY-MM')`                          | `DATE_FORMAT("created_at", '%Y-%m')` — MySQL has no `date_trunc`/`to_char`; `DATE_FORMAT` alone achieves the same "YYYY-MM" grouping key in one step                                                                                                                                                                                                                                         |
| `::float` cast                                                                   | `CAST(... AS DOUBLE)` or simply drop the cast — MySQL's `SUM()` over a `DECIMAL` column already returns a `DECIMAL`, and Prisma's `$queryRaw` will correctly type it; the explicit cast was Postgres-idiomatic, not functionally required                                                                                                                                                    |
| Double-quoted identifiers (`"created_at"`, `"donation"`, `"status"`, `"amount"`) | MySQL uses backticks for quoted identifiers (`` `created_at` ``) — double quotes in MySQL's default SQL mode are string literal delimiters, not identifier delimiters, so this syntax would be **silently misinterpreted**, not just rejected, unless MySQL's `ANSI_QUOTES` SQL mode is explicitly enabled (not assumed/relied upon elsewhere in this plan, so don't rely on it here either) |

Rewritten for MySQL:

```ts
prisma.$queryRaw<{ month: string; total: number }[]>`
  SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
         COALESCE(SUM(amount), 0) AS total
  FROM donation
  WHERE status = 'completed'
    ${dateFrom ? Prisma.sql`AND created_at >= ${dateFrom}` : Prisma.empty}
    ${dateTo ? Prisma.sql`AND created_at <= ${dateTo}` : Prisma.empty}
  GROUP BY 1
  ORDER BY 1
`;
```

(Unquoted identifiers work in both dialects as long as they don't collide with a reserved word — `donation`, `status`, `amount`, `created_at` are all safe unreserved identifiers in MySQL 8.)

The `Prisma.sql`/`Prisma.empty` templating helpers themselves are **provider-agnostic** — no change needed to that part of the query construction pattern.

### 4.2 `SELECT 1` health check

`api/src/routes/v1/health.routes.ts`: `await prisma.$queryRaw\`SELECT 1\`;` — valid, unchanged SQL in both dialects. No action needed.

### 4.3 Identifier casing convention

Every model in this schema uses `@map`/`@@map` to translate Prisma's camelCase field/model names to snake_case database columns/tables (e.g. `adminUserId` → `admin_user_id`) — this convention is entirely Prisma-side and portable; it works identically regardless of provider and requires no changes.

---

## 5. Index Differences

### 5.1 Index key length limit (the practical constraint that shapes §8's UUID decision)

MySQL's InnoDB storage engine has historically enforced a maximum index key length of **767 bytes** (with `ROW_FORMAT=COMPACT`/`REDUNDANT`) or **3072 bytes** (with `ROW_FORMAT=DYNAMIC`/`COMPRESSED` and `innodb_large_prefix` enabled, which is the default in MySQL 8). For a `utf8mb4` column (4 bytes per character, needed for proper Telugu support — see §2.5), this caps an indexable/unique/primary-key `VARCHAR` at **191 characters** under the conservative 767-byte limit, or up to 768 characters under the modern 3072-byte limit.

**This is why Prisma's MySQL provider defaults every `String @id`/`String @unique` field to `VARCHAR(191)`** rather than `TEXT` (which cannot be a primary/unique key at all in InnoDB without an explicit prefix length) — this happens automatically when `prisma migrate dev` generates the fresh baseline migration (§3.2); no manual schema annotation is required for the default case. This plan assumes MySQL 8 with default settings (`innodb_large_prefix=ON`, `ROW_FORMAT=DYNAMIC`), which comfortably accommodates every current unique/indexed string field in this schema (UUIDs are 36 characters; emails, receipt numbers, etc. are all well under 191).

### 5.2 Composite and covering indexes

All 41 `@@index` declarations in the schema (e.g. `Donation` on `[status, createdAt]`, `AuditLog` on `[adminUserId, timestamp]`) are standard B-tree composite indexes — **fully supported identically by MySQL's InnoDB engine**, no redesign needed. Composite index column-order semantics (leftmost-prefix matching) are the same in both databases.

### 5.3 No advanced/specialized indexes are in use

This schema uses zero `GIN`, `GiST`, `BRIN`, partial (`WHERE`-clause), or expression indexes — all Postgres-specific index types that would have no direct MySQL equivalent. Every index in this project is a plain or composite B-tree index, which is the default and only general-purpose index type MySQL's InnoDB engine provides. **No index redesign is required beyond the automatic DDL regeneration from §3.2.**

---

## 6. Full-Text Search Differences

**This application does not currently use PostgreSQL full-text search** (no `tsvector`/`tsquery` columns, no `to_tsvector()`/`@@` operators, no `pg_trgm` extension, no `GIN` text-search indexes anywhere in the schema or migrations). All "search" functionality in the codebase (donor search, donation search, admin-user search, event/news title search — the 6 files listed in §14) is implemented as a simple `contains` (SQL `LIKE '%term%'`) filter through Prisma, not a real full-text search engine.

**Consequence**: there is no full-text search feature to port. The only related change is removing `mode: 'insensitive'` (§14), because MySQL's default collation already makes `LIKE` case-insensitive without it.

**Optional future enhancement** (not required by this migration, noted for completeness since the section was requested): MySQL 8 supports native `FULLTEXT` indexes on `VARCHAR`/`TEXT` columns with `MATCH() AGAINST()` query syntax, roughly analogous in capability to Postgres's `tsvector` approach. If genuine full-text search (ranking, stemming, multi-word relevance) is ever wanted for donor/donation/news search, that would be a new feature built on top of this migration, not a requirement of it.

---

## 7. JSON Field Compatibility

Three `Json` fields exist: `AuditLog.beforeState`/`afterState`, `PageContent.blocksEn`/`blocksTe`, `PaymentWebhookEvent.payload`.

| Aspect                                                 | PostgreSQL                                                                                                                            | MySQL                                                                                                                                                                               | Impact                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native storage                                         | `jsonb` (binary, indexed-friendly) — Prisma's `Json` type maps to `jsonb` on Postgres by default                                      | `JSON` (MySQL 5.7.8+/8.0) — Prisma's `Json` type maps to native `JSON`                                                                                                              | Both are genuinely native JSON column types (not just `TEXT` with app-level parsing) — Prisma Client reads/writes plain JS objects identically on both, **zero application code change** for the read/write path used throughout this codebase (`writeAuditLog()`, `page-content.service.ts`, `webhook.service.ts`)                                                                                                                    |
| Querying/filtering _inside_ JSON at the database level | Postgres's `jsonb` supports rich operators (`@>`, `?`, path queries) via Prisma's `path`/`array_contains`/`array_starts_with` filters | MySQL's `JSON` type supports a smaller, different filter surface through Prisma (`path`, `array_contains` are supported; some advanced Postgres-only JSON filter operators are not) | **Not currently used anywhere in this codebase** — every `Json` field in this schema is only ever written wholesale and read back wholesale (e.g. `beforeState`/`afterState` are stored and displayed in the admin audit log viewer as opaque blobs, never filtered by an internal key at the database level). This means the JSON querying capability gap is real in the abstract but **exercises no code path in this application**. |
| Default value syntax                                   | `Json?` fields have no default in this schema                                                                                         | The new `tags` field (§2.1) needs `@default("[]")` — valid, portable Prisma syntax on both providers                                                                                | New addition, not an existing-field concern                                                                                                                                                                                                                                                                                                                                                                                            |

**Verdict: no functional risk.** This is the single area of the migration with the least real-world impact, because the application's JSON usage pattern (opaque read/write, no server-side JSON querying) happens to be exactly the portable subset that behaves identically on both databases.

---

## 8. UUID Handling

### 8.1 How UUIDs are currently generated (good news: already portable)

Every model uses `id String @id @default(uuid())`. This is **not** a PostgreSQL database-side default (i.e., it does not rely on Postgres's `gen_random_uuid()` function or the `uuid-ossp`/`pgcrypto` extensions — grep-confirmed absent from every migration file). Prisma's `@default(uuid())` is a **client-side (application-layer) default**: the Prisma Client generates a standard UUIDv4 string in Node.js before every insert, regardless of which database provider is configured. This is exactly the same code path, unchanged, for MySQL.

**Practical consequence: this is the smallest-risk item in the entire migration.** No application code, no seed script, no service-layer logic needs to change for UUID generation — it already works identically today against either provider.

### 8.2 What does change: the underlying column type

|                       | PostgreSQL (current)                                       | MySQL (after migration)                                                                                             |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Declared Prisma type  | `String @id @default(uuid())`                              | Same, unchanged                                                                                                     |
| Generated column type | `TEXT` (confirmed via migration SQL: `"id" TEXT NOT NULL`) | `VARCHAR(191)` (Prisma's default for MySQL primary-key strings, per §5.1)                                           |
| Storage overhead      | Marginally more flexible (no declared max length)          | Fixed 191-char cap — a standard UUIDv4 string is exactly 36 characters, comfortably within this, no truncation risk |

No manual `@db.VarChar(36)` annotation is strictly required (Prisma's default `VARCHAR(191)` already accommodates a 36-character UUID with room to spare), but adding an explicit `@db.VarChar(36)` on every `id`/foreign-key field is a reasonable, purely-optional tightening that would slightly reduce index size — **not recommended as part of this migration** (adds 55+ lines of schema annotation for a marginal storage optimization); can be revisited later as a standalone performance tuning pass if ever needed.

### 8.3 Zod UUID validation — unaffected

`idParamSchema` (`z.string().uuid()`), `bulkIdsSchema`, and every route param/body schema that validates a UUID format do so against the **string value itself** (canonical 8-4-4-4-12 hex format), completely independent of which database eventually stores that string. **Zero changes needed anywhere in `api/src/validation/`.**

---

## 9. Date/Time Differences

### 9.1 Column type

Postgres's `TIMESTAMP(3)` (as generated by Prisma for `DateTime` fields) and MySQL's `DATETIME(3)` (what Prisma generates instead) both store millisecond-precision date-and-time values with **no timezone information attached** — this project does not use `@db.Timestamptz`/timezone-aware columns anywhere (confirmed: no such annotation exists in the schema), so this is an apples-to-apples mapping.

### 9.2 The real semantic difference: how "now" and stored values relate to timezone

Both PostgreSQL's plain `TIMESTAMP` and MySQL's `DATETIME` store a timezone-**naive** value — the database has no inherent concept of what timezone a stored value represents; that responsibility sits entirely with the application (Node.js `Date` objects, which Prisma Client converts to/from). Since this application already follows that pattern consistently (no code anywhere calls a Postgres-specific timezone-conversion function, no `AT TIME ZONE` usage), **this migration introduces no new timezone-handling risk** — behavior is preserved exactly as long as the application server's own timezone/UTC handling conventions (already established, e.g. `new Date()` calls throughout the auth/session/OTP-expiry logic) remain unchanged, which they will, since none of that code is Postgres-specific.

**One MySQL-specific gotcha worth being aware of (not a code change, an operational note)**: MySQL's `DATETIME` type has no automatic "current session timezone" conversion the way MySQL's separate `TIMESTAMP` type does (note: MySQL's `TIMESTAMP` type is a _different, narrower_ type than what Prisma generates here — Prisma correctly avoids it, generating `DATETIME` instead, specifically because `TIMESTAMP`'s implicit timezone-conversion behavior and its narrower year-2038 range would be surprising and undesirable here). No action needed — just confirming Prisma already makes the correct choice.

### 9.3 `@db.Date`-only fields

`Appeal.startDate`/`endDate`, `EventNewsPost.eventDate`, `DocumentRepo.publishedDate`, `VolunteerAssignment.assignedDate` use `@db.Date` (date-only, no time component) — native `DATE` type exists identically in both PostgreSQL and MySQL. No change needed.

---

## 10. Transaction Differences

### 10.1 Default isolation level — the one genuinely important behavioral difference in this section

|                                     | PostgreSQL       | MySQL (InnoDB)    |
| ----------------------------------- | ---------------- | ----------------- |
| Default transaction isolation level | `READ COMMITTED` | `REPEATABLE READ` |

This project does not explicitly set an isolation level anywhere (no `prisma.$transaction([...], { isolationLevel: ... })` usage found in the codebase) — every transaction currently runs at each database's respective default. This matters specifically for the **Razorpay payment-completion race** the codebase already documents and defends against: `payment-verification.service.ts`'s `completeDonationFromPayment()` can be invoked from two independent paths (the synchronous `/donations/verify` request and the asynchronous webhook) racing to mark the same donation `completed`.

**Why the current code is already safe under both isolation levels**: the actual concurrency-safety mechanism here is not the isolation level — it's the **database-level unique constraint** on `Donation.paymentGatewayRef`/`razorpayOrderId` (confirmed in SECURITY_REPORT.md §13) combined with an application-level `P2002` (unique-violation) catch that maps a lost race to a clean `409 Conflict` rather than silent corruption. This pattern is isolation-level-agnostic — it works correctly whether the underlying default is `READ COMMITTED` or `REPEATABLE READ`, because it doesn't rely on read-consistency guarantees between the two racing transactions at all; it relies on the constraint rejecting the second writer outright.

**What _is_ worth an explicit decision, not a silent default-swap**: MySQL's `REPEATABLE READ` uses gap locking in a way that can produce different (usually _more_ conservative, occasionally surprising) lock-wait/deadlock behavior under concurrent writes to the same rows compared to Postgres's `READ COMMITTED`, particularly for the admin CRUD "read-then-update" patterns (`buildSimpleCrudRouter`'s `PATCH`/`DELETE` handlers, which do a `findById` then act on the result — not wrapped in an explicit transaction currently, so each is its own auto-committed statement pair rather than one atomic transaction either way, meaning this specific pattern's behavior doesn't actually change between the two databases). **Recommendation**: no code change required for this migration; flag this as a monitoring item post-migration (watch for MySQL deadlock errors under concurrent admin usage during the burn-in period referenced in §3.4) rather than pre-emptively wrapping every read-then-write in explicit transactions as part of this migration's scope.

### 10.2 Prisma's `$transaction` API — no change needed

Prisma's interactive transactions (`prisma.$transaction(async (tx) => { ... })`) and the sequential-array form (`prisma.$transaction([...])`) are both provider-agnostic Prisma Client APIs — they work identically against MySQL. **This codebase does not currently use `$transaction` anywhere** (grep-confirmed) — every multi-step write sequence (e.g. `createManualDonation()`'s donor-then-donation-then-receipt sequence in `donation.service.ts`) is currently a series of independent, sequential Prisma calls, not wrapped in a single atomic transaction, on either database. This is an existing characteristic of the codebase, not something this migration changes or needs to change.

---

## 11. Environment Variable Changes

### 11.1 `DATABASE_URL` format

|                        | Before                                                                      | After                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scheme                 | `postgresql://`                                                             | `mysql://`                                                                                                                                                                                    |
| Example                | `postgresql://sysa_user:sysa_password@localhost:5432/sysa_db?schema=public` | `mysql://sysa_user:sysa_password@localhost:3306/sysa_db`                                                                                                                                      |
| Default port           | `5432`                                                                      | `3306`                                                                                                                                                                                        |
| `?schema=` query param | Used (Postgres schemas are a real namespacing concept)                      | **Not applicable** — MySQL has no equivalent "schema within a database" concept the way Postgres does (a MySQL "schema" is just a synonym for "database"); drop this query parameter entirely |

Files containing this connection string that need updating: `api/.env.example`, `api/.env` (local/untracked, must be updated by whoever runs the migration locally — not committed, not touched by this plan directly), `.env.example` (root), `docker-compose.yml`, `.github/workflows/ci.yml`.

### 11.2 `POSTGRES_*` → MySQL-equivalent variable names

Root `.env.example` currently defines:

```
POSTGRES_PORT=5432
POSTGRES_USER=sysa_user
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_DB=sysa_db
```

Recommended replacement naming (used to parameterize the new `docker-compose.yml` MySQL service, §12):

```
MYSQL_PORT=3306
MYSQL_USER=sysa_user
MYSQL_PASSWORD=change-me-in-production
MYSQL_DATABASE=sysa_db
MYSQL_ROOT_PASSWORD=change-me-in-production-too
```

(`MYSQL_ROOT_PASSWORD` is new — MySQL's official Docker image requires a root password to be set even when a non-root application user/database is also being created via `MYSQL_USER`/`MYSQL_PASSWORD`/`MYSQL_DATABASE`, unlike Postgres's official image which doesn't need an equivalent separate superuser bootstrap variable for this project's usage pattern.)

### 11.3 No other environment variables are database-provider-specific

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_*`, `CLOUDINARY_*`, `SMTP_*`, `CORS_ORIGIN`, `COOKIE_DOMAIN`, `NEXT_PUBLIC_*` — none of these reference PostgreSQL in any way and require **no changes**.

---

## 12. Docker Changes

### 12.1 `docker-compose.yml` — `postgres` service → `mysql` service

Current:

```yaml
postgres:
  image: postgres:16-alpine
  container_name: sysa-postgres
  restart: unless-stopped
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-sysa_user}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-sysa_password}
    POSTGRES_DB: ${POSTGRES_DB:-sysa_db}
  ports:
    - '${POSTGRES_PORT:-5432}:5432'
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-sysa_user} -d ${POSTGRES_DB:-sysa_db}']
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - sysa-network
```

Replacement:

```yaml
mysql:
  image: mysql:8.0
  container_name: sysa-mysql
  restart: unless-stopped
  command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-change-me}
    MYSQL_USER: ${MYSQL_USER:-sysa_user}
    MYSQL_PASSWORD: ${MYSQL_PASSWORD:-sysa_password}
    MYSQL_DATABASE: ${MYSQL_DATABASE:-sysa_db}
  ports:
    - '${MYSQL_PORT:-3306}:3306'
  volumes:
    - mysql_data:/var/lib/mysql
  healthcheck:
    test:
      [
        'CMD',
        'mysqladmin',
        'ping',
        '-h',
        'localhost',
        '-u',
        'root',
        '-p${MYSQL_ROOT_PASSWORD:-change-me}',
      ]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - sysa-network
```

Key differences beyond the obvious image/env-var swap:

- **`command: --character-set-server=... --collation-server=...`** — this is the concrete implementation of the §2.5 recommendation; without it, MySQL 8 defaults to `utf8mb4_0900_ai_ci` (actually a reasonable, Unicode-aware default on MySQL 8 specifically — `utf8mb4_unicode_ci` shown here is the more conservative, broadly-documented choice; either is acceptable, but it should be a **deliberate** flag, not left to image-version-dependent defaults, which is why it's called out explicitly here rather than omitted).
- **Healthcheck tool**: `pg_isready` → `mysqladmin ping` (Postgres and MySQL images ship different built-in health-check CLIs).
- **Volume path**: `/var/lib/postgresql/data` → `/var/lib/mysql` (MySQL's official image data directory).
- **Volume name**: `postgres_data` → `mysql_data` (referenced again in the `volumes:` top-level block at the bottom of the file).

### 12.2 `api` service's `DATABASE_URL` construction

Current:

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER:-sysa_user}:${POSTGRES_PASSWORD:-sysa_password}@postgres:5432/${POSTGRES_DB:-sysa_db}?schema=public
```

Replacement:

```yaml
DATABASE_URL: mysql://${MYSQL_USER:-sysa_user}:${MYSQL_PASSWORD:-sysa_password}@mysql:3306/${MYSQL_DATABASE:-sysa_db}
```

(Hostname changes from `postgres` to `mysql` to match the renamed service; `?schema=public` dropped per §11.1.)

The `api` service's `depends_on: postgres: condition: service_healthy` block must be renamed to `depends_on: mysql: condition: service_healthy` accordingly.

### 12.3 `api/Dockerfile`

Grep-confirmed: contains **no** PostgreSQL-specific instructions (no `apt-get install postgresql-client`, no `pg_isready` calls, no Postgres client library installation) — it's a standard Node.js multi-stage build that relies entirely on `@prisma/client`'s bundled query engine binaries, which Prisma automatically fetches the correct (MySQL-compatible) engine for based on `schema.prisma`'s provider at `prisma generate` time. **No Dockerfile changes needed.**

### 12.4 `infrastructure/nginx/` — unaffected

Nginx has no awareness of what database sits behind the API it proxies. **No changes needed.**

### 12.5 `infrastructure/pm2/ecosystem.config.js` — unaffected

PM2 process definitions reference `dist/server.js` and env-var passthrough only, no database-specific configuration. **No changes needed.**

---

## 13. Deployment Changes

### 13.1 `DEPLOYMENT_GUIDE.md` — needs a full pass

Written during the immediately-preceding Production Readiness phase, this document currently states PostgreSQL as a hard prerequisite in multiple places and needs updates to: the architecture diagram (§1, "api → PostgreSQL 16"), the prerequisites table (§2, "PostgreSQL 16 ... Provided by `docker-compose.yml`'s `postgres` service"), the `DATABASE_URL` example (§3.1), and any Postgres-specific operational notes. This is a documentation update, not a code change, but is explicitly in scope for "files that must be modified" (§15).

### 13.2 `GO_LIVE_CHECKLIST.md` §2 ("Database")

Currently says "Production PostgreSQL instance provisioned" — needs updating to MySQL, and the note about this being "the first time these migrations will ever touch a real database" remains equally true and equally important for the _new_ MySQL migration history (§3.2's fresh baseline has similarly never been applied to a real database either, at the time of writing this plan).

### 13.3 Managed database hosting considerations (new decision point, not present in the original Postgres deployment guide)

If deploying to a managed database service rather than the `docker-compose.yml` MySQL container, note the provider landscape differs somewhat from Postgres's (e.g., AWS RDS/Aurora MySQL, PlanetScale, DigitalOcean Managed MySQL are common equivalents to what RDS/Supabase were for Postgres) — no code in this project is tied to a specific managed provider either way (connection is via a plain `DATABASE_URL`), so this is purely an infrastructure-choice note, not a blocker.

### 13.4 CI/CD (`.github/workflows/ci.yml`)

The `build` job's `services.postgres` block (image `postgres:16-alpine`, `pg_isready` healthcheck) and both `DATABASE_URL` environment values (`lint-and-typecheck` job's Prisma-generate step, `build` job's migrate/seed steps) need the same service-swap treatment as §12.1/§12.2, adapted for GitHub Actions' `services:` container syntax (which supports MySQL service containers identically to Postgres ones — no CI platform limitation here).

---

## 14. Potential Breaking Changes

This is the consolidated, priority-ordered list of everything that will actually **break at runtime** (not just require a mechanical config change) if the provider is switched without corresponding code changes:

### 14.1 **CRITICAL**: `mode: 'insensitive'` throws a runtime error on MySQL

Prisma explicitly documents `mode: 'insensitive'` as supported **only** for PostgreSQL and MongoDB. Calling it against a MySQL datasource does not silently do nothing — Prisma throws a validation error at query time (`Invalid ... mode is not supported for the current provider`). This will break every one of the following search features immediately upon switching the provider, unless fixed first:

| File                                            | Lines | Feature affected                        |
| ----------------------------------------------- | :---: | --------------------------------------- |
| `api/src/repositories/admin-user.repository.ts` | 27–28 | Admin user list search (name/email)     |
| `api/src/repositories/donation.repository.ts`   | 45–46 | Donation list search (donor name/email) |
| `api/src/repositories/donor.repository.ts`      | 33–34 | Donor list search (name/email)          |
| `api/src/repositories/event.repository.ts`      |  21   | Event admin list search (title)         |
| `api/src/repositories/news-post.repository.ts`  |  18   | News admin list search (title)          |
| `api/src/repositories/volunteer.repository.ts`  | 29–30 | Volunteer list search (name/email)      |

**The fix is a deletion, not a replacement**: MySQL's default collation (`utf8mb4_unicode_ci`/`utf8mb4_0900_ai_ci`, both `_ci` = case-insensitive, per §2.4) already makes `contains` filters case-insensitive without any additional query option. The correct MySQL-compatible version of e.g. `{ name: { contains: params.search, mode: 'insensitive' } }` is simply `{ name: { contains: params.search } }` — same case-insensitive behavior, achieved by the database's collation instead of an explicit query flag. **This is the single most important item in this entire plan** — every other finding is either mechanical config or has no functional runtime consequence; this one actively breaks 6 admin-panel search features the moment the provider switches, unless addressed in the same change.

### 14.2 **HIGH**: `EventNewsPost.tags String[]` has no valid MySQL schema translation

Covered in depth in §2.1 — `prisma generate`/`prisma migrate dev` will simply **fail outright** with a clear schema-validation error if this field is left as a scalar array while the provider is `mysql` (Prisma catches this at schema-validation time, before ever touching a database — it will not silently produce broken SQL). This forces the fix to happen before the migration can proceed at all, which is a helpful safety net, not a subtle landmine — but it must be resolved before step 3.2.2 (generating the fresh baseline migration) can succeed.

### 14.3 **MEDIUM**: raw SQL query fails outright

The `getAnalytics()` query in §4.1 uses PostgreSQL-only function names (`to_char`, `date_trunc`) that do not exist in MySQL's SQL dialect. This is not a subtle behavior difference — it is a "function does not exist" SQL error the moment `/admin/donations/analytics` or `/admin/reports` is loaded post-migration, unless rewritten first.

### 14.4 **MEDIUM**: email/donor uniqueness semantics change (behavioral, not an error)

Covered in §2.4 — not a crash, but a genuine change in what counts as a duplicate. Recommend deciding and documenting this explicitly (and adding application-level email lowercasing for defense-in-depth) rather than letting it be an undocumented side effect of the collation default.

### 14.5 **LOW**: Telugu sort-order quality

Covered in §2.5 — not a crash, not data loss, but a real user-facing quality regression (Telugu content sorting/comparing incorrectly) if the collation is left at MySQL's plain default instead of an explicit Unicode-aware collation. Silent and easy to miss in testing if reviewers aren't specifically checking Telugu-locale content ordering.

### 14.6 **LOW**: reserved-word collisions in future raw SQL (forward-looking caution, not a current bug)

MySQL and PostgreSQL have different reserved-word lists. This project's current single raw query (§4.1) was checked and contains no MySQL reserved words once rewritten. Flagged here only as a standing caution for any **future** raw SQL added to this codebase after the migration — table/column names in this schema (`status`, `order`, `key` are common trouble spots in other projects) should be checked against MySQL's reserved-word list if ever referenced unquoted in a future raw query; none of this project's current column names happen to collide.

### 14.7 Explicitly NOT a breaking change (to close out common false assumptions)

- **UUID generation** — already application-side, portable (§8).
- **JSON fields** — already used in the portable subset of functionality (§7).
- **Decimal/Date columns** — directly portable annotations (§1.4, §9).
- **Prisma's `$transaction` API** — provider-agnostic, and not currently used in this codebase anyway (§10.2).
- **Enum types** — different DDL, identical TypeScript-level behavior (§2.3).
- **Indexes** — all standard B-tree, no specialized Postgres index types in use (§5).

---

## 15. Files That Must Be Modified

Grouped by category, in the order they'd naturally be touched during implementation:

### 15.1 Prisma schema & migrations

- `api/prisma/schema.prisma` — `provider = "mysql"` (§1.1), `EventNewsPost.tags` field redesign (§2.1)
- `api/prisma/migrations/` — entire directory deleted and regenerated as one fresh baseline migration (§3.2)
- `api/prisma/migrations/migration_lock.toml` — regenerated automatically as part of the above (not hand-edited)

### 15.2 Application code

- `api/src/repositories/admin-user.repository.ts` — remove `mode: 'insensitive'` (§14.1)
- `api/src/repositories/donation.repository.ts` — remove `mode: 'insensitive'` (§14.1) **and** rewrite the raw analytics query (§4.1)
- `api/src/repositories/donor.repository.ts` — remove `mode: 'insensitive'` (§14.1)
- `api/src/repositories/event.repository.ts` — remove `mode: 'insensitive'` (§14.1)
- `api/src/repositories/news-post.repository.ts` — remove `mode: 'insensitive'` (§14.1); review `tags` field mapping for the new JSON representation (§2.1) alongside `api/src/services/news-post.service.ts` and `api/src/validation/news-post.schema.ts` for any type-level fallout from the schema change (expected to be minimal to none, since the external TS type remains `string[]` — but must be verified once the change is made, per `npm run typecheck`)
- `api/src/repositories/volunteer.repository.ts` — remove `mode: 'insensitive'` (§14.1)

### 15.3 Environment configuration

- `api/.env.example` — `DATABASE_URL` scheme/port/query-param (§11.1)
- `api/.env` — same, local/untracked file, not committed
- `.env.example` (root) — `POSTGRES_*` → `MYSQL_*` variables (§11.2), `DATABASE_URL` example if present there too

### 15.4 Docker & infrastructure

- `docker-compose.yml` — `postgres` service → `mysql` service, `api` service's `DATABASE_URL`/`depends_on` (§12.1, §12.2)
- `infrastructure/nginx/` — confirmed no changes needed (§12.4)
- `infrastructure/pm2/ecosystem.config.js` — confirmed no changes needed (§12.5)
- `api/Dockerfile` — confirmed no changes needed (§12.3)

### 15.5 CI/CD

- `.github/workflows/ci.yml` — `services.postgres` → `services.mysql` block, both `DATABASE_URL` env values (§13.4)

### 15.6 Documentation (non-blocking, but real files with real PostgreSQL claims that would become inaccurate)

Documentation files that explicitly name PostgreSQL and would need a follow-up pass (lower priority than §15.1–15.5, does not block a working migration, but leaving them stale would misinform future readers of this codebase):

- `documentation/02-SRS.md`
- `documentation/04-Non-Functional-Requirements.md`
- `documentation/08-Database-Requirements.md`
- `documentation/11-Technology-Stack.md`
- `design/13-API-Architecture.md`
- `design/14-Folder-Structure.md`
- `design/15-Deployment-Architecture.md`
- `design/SYSTEM_DESIGN.md`
- `README.md`
- `DEVELOPMENT_PROGRESS.md` (multiple per-phase mentions of PostgreSQL throughout the historical record — recommend leaving the _historical_ phase entries as-written, since they accurately describe what was true when those phases were built, and adding a new dated entry for this migration rather than rewriting history)
- `DEPLOYMENT_GUIDE.md` (§13.1 above — recommend a full pass, not just a find-replace, since it has prescriptive setup commands)
- `GO_LIVE_CHECKLIST.md` (§13.2 above)
- `KNOWN_LIMITATIONS.md` (currently says "No live PostgreSQL... has existed" — should become "No live MySQL... has existed" if this plan is executed before a real database is ever stood up, which is the current state per §3.3)

### 15.7 Explicitly NOT requiring changes (confirmed by this review, listed to avoid unnecessary rework)

- `api/src/lib/prisma.ts` (the shared `PrismaClient` singleton) — no provider-specific code
- Every Zod validation schema in `api/src/validation/` — all validate plain TypeScript values, not database-specific formats (§8.3)
- Every frontend file in `website/` — the frontend has no database awareness whatsoever, it only talks to the API over HTTP
- `api/src/lib/jwt.ts`, `donor-jwt.ts`, `razorpay-signature.ts`, `tokens.ts` — no database dependency
- `api/src/integrations/` (Cloudinary, email, Razorpay clients) — no database dependency
- `api/prisma/seed.ts` — uses only the Prisma Client's standard create/upsert calls with no raw SQL or Postgres-specific syntax (confirmed via review); should run unchanged against the new schema once the `tags`-field-dependent seed data, if any, is checked (a quick grep confirms the seed script does not currently seed any `EventNewsPost` rows with tags, so no seed-data change is expected, but should be re-verified at implementation time)

---

## 16. Suggested Implementation Order (once approved)

1. Fix `mode: 'insensitive'` (§14.1) and the `tags` field (§14.2) in a preparatory commit — these are valid, harmless changes against the _current_ PostgreSQL database too (removing `mode: 'insensitive'` from a Postgres query just makes it case-sensitive again, which would itself be a behavior change worth its own review/decision, OR keep Postgres's case-insensitivity by using `ILIKE`-equivalent behavior... **this is exactly the kind of nuance that argues for doing the provider switch and the search-behavior decision together, not staging them separately** — recommend against the "fix on Postgres first" approach for `mode: 'insensitive'` specifically; do it as one atomic change with the provider switch.
2. Rewrite the raw analytics query (§4.1) — this one genuinely can be prepared as MySQL-only syntax and would need to be swapped in at the same moment as the provider switch (it cannot run against Postgres, so it can't be a "safe" preparatory commit the way step 1's is not either, per the note above).
3. Switch `provider` to `mysql`, regenerate the client, delete and regenerate migrations (§1, §3.2) — this is the point of no return for the local development environment; do this on a feature branch.
4. Update Docker/CI/env files (§11–13).
5. Full verification loop against a real local MySQL instance: `npm run lint && npm run typecheck && npm run build`, plus (unlike every prior phase in this project, which has operated without a live database) an actual `prisma migrate deploy` + `prisma db seed` + manual smoke test — **this migration is the first opportunity this project has had to test against a real, live database**, since MySQL would need to be stood up locally to develop against in the first place. This is worth calling out as a genuine opportunity, not just a migration cost: it closes several of the KNOWN_LIMITATIONS.md gaps (database schema/migrations, in particular) as a side effect.
6. Documentation pass (§15.6).

---

## 17. Open Questions for the Client / Decision-Makers Before Implementation

1. **Email case-sensitivity** (§2.4): confirm that case-insensitive email uniqueness (the MySQL default) is the desired behavior, and approve adding application-level email lowercasing for consistency.
2. **Collation choice** (§2.5): `utf8mb4_unicode_ci` vs `utf8mb4_0900_ai_ci` (MySQL 8-only, marginally more accurate) — either is acceptable; a specific choice should be confirmed rather than left to chance.
3. **`tags` field redesign** (§2.1): confirm JSON-column is acceptable, or specify a preference for the join-table approach if tag-based filtering is anticipated as a near-term feature (which would make the more expensive normalized-table option worth doing now rather than twice).
4. **MySQL version target**: this plan assumes MySQL 8.0+. If the hosting target is a managed MySQL service that only offers 5.7, several assumptions in §5.1 (default `innodb_large_prefix`) and §7 (JSON support maturity) should be re-verified against that specific version.
5. **Data migration timing** (§3.3): confirm there is genuinely no production data yet (per KNOWN_LIMITATIONS.md, there should not be) — if there is any real data anywhere this plan doesn't know about, §3.3's ETL approach needs to be scoped and scheduled as its own workstream before the schema-only steps in §16 are executed.
