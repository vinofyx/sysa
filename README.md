# Sai Yadadri Seva Ashram Platform

Production-ready website and donation platform for **Sai Yadadri Seva Ashram** (Regd. No. 423/2019), a registered social service society in Hyderabad, Telangana, operating the Vanaprasthasramam Old Age Home and associated Annaprasadam, Goshala, Education, and Medical Support programs.

This repository has completed **Phase 4 — Core Application Framework**: production authentication (JWT + httpOnly cookies, refresh rotation, password reset, email verification, account lockout, session management), a fully configurable RBAC system (10 roles), the core backend APIs (auth/users/roles/permissions/profile, Swagger-documented), and the frontend framework (auth pages, protected admin shell, dashboard shell, profile/settings pages, error pages). No donation, content, volunteer, event, or gallery business modules are implemented yet — see [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) for full status.

## Documentation

This codebase is built directly from three prior planning phases. Read them in this order before touching code:

1. [`documentation/`](documentation/MASTER_PROJECT_PLAN.md) — Business Requirements, SRS, Functional/Non-Functional Requirements, Database Requirements, Roles & Permissions, Security Requirements, etc. (16 documents)
2. [`design/`](design/SYSTEM_DESIGN.md) — Information Architecture, Sitemap, User/Admin Flows, Wireframes, Design System, Database ERD, API Architecture, Folder Structure, Deployment Architecture (15 documents)
3. [`docs/`](docs/PROJECT_CONTEXT.md) — Extracted source-of-truth data from the client's original documents (brochure, committee list, bank details, etc.)

## Technology Stack

| Layer          | Technology                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, TanStack Query, Axios, Framer Motion |
| Backend        | Node.js, Express, TypeScript, Prisma ORM, MySQL 8, JWT, bcrypt, Multer, Cloudinary SDK, Nodemailer, Winston                           |
| Infrastructure | Docker, Docker Compose, Nginx, PM2, GitHub Actions, ESLint, Prettier, Husky                                                           |

Full justification for every choice: [`documentation/11-Technology-Stack.md`](documentation/11-Technology-Stack.md).

## Repository Structure

```
sysa/
├── apps/
│   ├── web/              # Next.js 15 frontend (public site + admin dashboard shell)
│   └── api/               # Express + TypeScript backend API
├── infrastructure/
│   ├── nginx/             # Reverse proxy configuration
│   └── pm2/                # PM2 process manager config (non-Docker VPS deployment path)
├── .github/workflows/     # CI pipeline
├── docs/                  # Source client documents + extracted project context
├── documentation/         # Phase 1 — BRD, SRS, requirements, etc.
├── design/                # Phase 2 — IA, wireframes, design system, architecture
├── docker-compose.yml     # Local/single-host orchestration (MySQL + API + Web + Nginx)
└── package.json           # npm workspaces root
```

Full rationale: [`design/14-Folder-Structure.md`](design/14-Folder-Structure.md).

## Prerequisites

- Node.js ≥ 20 (see `.nvmrc`)
- npm ≥ 10
- Docker + Docker Compose (for local MySQL, or full containerized dev)
- Git

## Getting Started (Local Development)

### 1. Clone and install

```bash
git clone <repository-url> sysa
cd sysa
npm install
```

This installs dependencies for the root workspace and both `website` and `api` in one pass (npm workspaces), and sets up Git hooks (Husky) automatically via the `prepare` script.

### 2. Configure environment variables

Copy each example file and fill in real values:

```bash
cp .env.example .env                       # Docker Compose orchestration variables
cp api/.env.example api/.env      # Backend runtime variables
cp website/.env.example website/.env.local # Frontend runtime variables
```

At minimum, generate strong JWT secrets:

```bash
openssl rand -base64 48   # run twice — once for JWT_ACCESS_SECRET, once for JWT_REFRESH_SECRET
```

Cloudinary, Razorpay, and SMTP credentials are optional for local foundation work — the app boots and logs a clear warning if they're unset (see `api/src/integrations/`). They become required once the corresponding features are implemented.

### 3. Start MySQL

**Option A — Docker (recommended):**

```bash
docker compose up -d mysql
```

**Option B — local MySQL install:** create a database matching your `api/.env` `DATABASE_URL`, using `utf8mb4` / `utf8mb4_0900_ai_ci` (falls back to `utf8mb4_unicode_ci` on MySQL builds where `utf8mb4_0900_ai_ci` is unavailable) for correct English/Telugu/Unicode/emoji support.

### 4. Set up the database schema

```bash
npm run prisma:generate --workspace=api
npm run prisma:migrate --workspace=api    # applies api/prisma/migrations/20260804120000_init_mysql/
npm run prisma:seed --workspace=api        # seeds RBAC roles/permissions + donation categories + a bootstrap Super Admin
```

> **Note:** The committed migration was generated via `prisma migrate diff` (no live MySQL was available in the environment that authored it) and has not yet been applied against a real database — running `prisma:migrate` above will be the first time it is. If Prisma reports drift, resolve it locally and commit any follow-up migration it generates. This project migrated from PostgreSQL to MySQL — see [MYSQL_MIGRATION_REPORT.md](MYSQL_MIGRATION_REPORT.md) for the full rationale and change list.

The seed script creates one bootstrap **Super Admin** account so you can log in immediately:

- Email: value of `SEED_SUPER_ADMIN_EMAIL` in `api/.env` (default `superadmin@sysaindia.org`)
- Password: value of `SEED_SUPER_ADMIN_PASSWORD` in `api/.env` — **set this explicitly**; the fallback dev-only password is printed as a warning by the seed script and must never be used outside local development.

### 5. Run the dev servers

```bash
npm run dev
```

This runs both the API (`http://localhost:4000`) and the web app (`http://localhost:3000`) concurrently. Or run them individually:

```bash
npm run dev:api
npm run dev:web
```

### 6. Verify

- Frontend: [http://localhost:3000](http://localhost:3000) — public placeholder home page.
- Admin login: [http://localhost:3000/login](http://localhost:3000/login) — sign in with the seeded Super Admin above, lands on `/admin` (dashboard shell).
- API health check: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) — should return `{"status":"ok", ...}` once MySQL is reachable.
- API docs (Swagger UI): [http://localhost:4000/api/v1/docs](http://localhost:4000/api/v1/docs).

## Running with Docker Compose (Full Stack)

```bash
cp .env.example .env   # fill in real values first
docker compose up -d --build
```

This starts MySQL, the API, the Next.js frontend, and an Nginx reverse proxy (`http://localhost` by default). See [`design/15-Deployment-Architecture.md`](design/15-Deployment-Architecture.md) for the full topology.

## Production hosting

**Render is not required.** Production is:

- **Website:** Hostinger Premium shared hosting — static Apache at `https://sysa.in` (`website/out` / `hostinger-site`).
- **API:** the existing Node.js 20 app in `api/`, on a **separate** host (not Render). `npm start` runs `node dist/server.js`; `npm run start:prod` runs `npx prisma migrate deploy && node dist/server.js`. Bind `BIND_HOST=0.0.0.0` and `process.env.PORT`.
- **Public API URL:** `https://sysa.in/api/v1`. Hostinger `api-proxy.php` forwards `/api/*` (method, query, Authorization, raw body) to the Node origin in `api-upstream.php`. Do not put `/api/v1` on that origin.
- **Database:** Hostinger MySQL via `DATABASE_URL` on the Node host only. Enable **Remote MySQL** for the Node host IP. Run `npx prisma migrate deploy` against production — never `migrate reset`, never local `sysa_local_dev`.
- **Secrets:** Razorpay secret, webhook secret, SMTP, WhatsApp, Cloudinary secret, JWT, and `DATABASE_URL` stay on the Node host. The website may only contain `NEXT_PUBLIC_API_URL=https://sysa.in` and the public Razorpay key returned by `initiate`.
- **Razorpay:** Checkout is `initiate` → Checkout → `verify`. Webhook `https://sysa.in/api/v1/webhooks/razorpay` (`payment.captured`). Validate with **test-mode** keys, not live charges.

Step-by-step checklist, env templates (`api/.env.production.example`), and proxy files: [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

Local development still uses `http://localhost:4000` via `api/.env` / `website/.env.local`. Do not point local `NEXT_PUBLIC_API_URL` at production unless you intend to call production.

## Available Scripts (root)

| Script                                             | Description                              |
| -------------------------------------------------- | ---------------------------------------- |
| `npm run dev`                                      | Run both apps concurrently in watch mode |
| `npm run build`                                    | Build both apps for production           |
| `npm run lint` / `npm run lint:fix`                | Lint both apps                           |
| `npm run typecheck`                                | Type-check both apps (no emit)           |
| `npm run format` / `npm run format:check`          | Prettier across the whole repo           |
| `npm run prisma:generate` / `:migrate` / `:studio` | Prisma commands, scoped to `api`         |

Per-app scripts are documented in `website/package.json` and `api/package.json`.

## Code Quality Gates

- **ESLint** (flat config, per app) + **Prettier** — run automatically on staged files via **Husky** + **lint-staged** on every commit.
- **Commit messages** are checked for a minimum length by a Husky `commit-msg` hook.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) runs lint, typecheck, format-check, a full build, an API health-check smoke test, and a dependency audit on every push/PR to `main`/`develop`.

## Known Security Advisories (Tracked, Not Blocking)

`npm audit` currently reports advisories in two places that are **not independently fixable at the application level** without breaking the toolchain:

1. **`postcss`/`sharp` bundled inside `next`'s own dependency tree** — internal to Next.js 15.5.x's build pipeline; `npm audit fix --force` would downgrade Next.js to an ancient v9 release, which is not a real fix. Tracked for resolution via a future Next.js patch/minor upgrade.
2. **`tar` (via `bcrypt` → `node-pre-gyp`)** — used only at `npm install` time to fetch bcrypt's prebuilt native binary from a trusted registry/GitHub release, not at runtime against user input. A forced major-version override was tested and rejected because it produces an invalid dependency tree (`npm ls` flags it). Low real-world exposure given the install-time-only, trusted-source usage.

Both are documented here rather than silently ignored — re-audit (`npm audit`) after any `next`, `sharp`, or `bcrypt` version bump.

## Contributing / Next Steps

See [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) for exactly what's implemented, what's deferred, and the recommended next development phase.

---

**Project source of truth:** [`documentation/MASTER_PROJECT_PLAN.md`](documentation/MASTER_PROJECT_PLAN.md) · [`design/SYSTEM_DESIGN.md`](design/SYSTEM_DESIGN.md)
