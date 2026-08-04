# Deployment Guide

## Sai Yadadri Seva Ashram Platform

This guide walks through deploying the platform using the infrastructure already committed to this repository (`docker-compose.yml`, `infrastructure/`) — it documents how to _use_ what's already built, it does not introduce a new deployment architecture.

---

## 1. Architecture Overview

```
Internet → Nginx (infrastructure/nginx/) → ┬─ /api/* → apps/api (Express, port 4000)
                                            └─ /*     → apps/web (Next.js, port 3000)
                                                              │
                                                        apps/api → MySQL 8.0+
```

Two deployment paths are both fully configured in this repo:

- **Docker Compose** (`docker-compose.yml`) — single-host, containerized. Recommended for the initial production deployment.
- **PM2** (`infrastructure/pm2/ecosystem.config.js`) — direct-VPS, cluster mode (2 instances each of api/web by default), for teams that prefer bare-metal/VPS process management over containers.

Both share the same Nginx routing config (`infrastructure/nginx/conf.d/default.conf`), which already special-cases the Razorpay webhook path (`/api/v1/webhooks/`) with request buffering disabled — this was configured back in the project's foundational phase, in anticipation of exactly the payment integration built in Phase 7.

---

## 2. Prerequisites

| Requirement                                                 | Notes                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MySQL 8.0+ (utf8mb4 / utf8mb4_0900_ai_ci)                   | Provided by `docker-compose.yml`'s `mysql` service, or an external managed instance (RDS/Aurora MySQL, PlanetScale, DigitalOcean Managed MySQL, etc.) — see [MYSQL_MIGRATION_REPORT.md](MYSQL_MIGRATION_REPORT.md)        |
| Node.js ≥ 20                                                | Matches `engines.node` in both `apps/api/package.json` and `apps/web/package.json`                                                                                                                                        |
| Cloudinary account                                          | For gallery/document/receipt-PDF/resume storage — **not yet configured in any environment this project has been built in; required before go-live**                                                                       |
| Razorpay merchant account (live or test mode)               | **Not yet configured** — pending client KYC per `documentation/16-Assumptions-and-Dependencies.md` D-01. This is the single most important pre-launch dependency — see GO_LIVE_CHECKLIST.md                               |
| SMTP provider (SES, SendGrid, or any SMTP-compatible relay) | For transactional email (receipts, password resets, OTP codes, notifications)                                                                                                                                             |
| A domain + TLS certificate                                  | TLS termination is expected at the CDN/edge layer in front of Nginx (per `design/15-Deployment-Architecture.md`), or extend the Nginx config with a `server{}` TLS block if Nginx is the outermost layer in your topology |

---

## 3. Environment Variables

Copy `.env.example` (root) and `apps/api/.env.example` to real `.env` files and fill in every value. **Never commit the filled-in file** — `.gitignore` already excludes `.env*` except `.env.example`.

### 3.1 Required (app will not boot without these)

```bash
DATABASE_URL=mysql://user:password@host:3306/dbname
JWT_ACCESS_SECRET=<32+ random characters>
JWT_REFRESH_SECRET=<32+ random characters, different from the above>
```

Generate strong secrets, e.g.: `openssl rand -base64 48`

### 3.2 Required before the corresponding feature will work

```bash
# Payments — donations will fail with a clear "not configured" error until these are set
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Media storage — uploads (gallery, documents, receipts, résumés) will fail until these are set
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email — sends silently no-op (logged, not thrown) until these are set; the app remains
# fully functional without them, but no email is ever delivered
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=no-reply@yourdomain.org
```

### 3.3 Deployment-specific

```bash
NODE_ENV=production
API_URL=https://api.yourdomain.org        # or https://yourdomain.org/api if path-routed
WEB_URL=https://yourdomain.org
CORS_ORIGIN=https://yourdomain.org        # must exactly match WEB_URL — no wildcard
COOKIE_DOMAIN=yourdomain.org              # omit for localhost/single-host dev
NEXT_PUBLIC_API_URL=https://api.yourdomain.org   # web app build arg — see §5
NEXT_PUBLIC_SITE_URL=https://yourdomain.org      # web app build arg — also used for CSP, sitemap, canonical URLs
```

**Important**: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are baked into the Next.js build at build time (they're also read directly by `next.config.ts` to construct the Content-Security-Policy's `connect-src`) — if you change them, you must **rebuild** the web image/app, not just restart it with new env vars.

---

## 4. Database Setup

```bash
# From apps/api, with DATABASE_URL pointing at your production database
npm run prisma:deploy --workspace=apps/api    # applies all committed migrations
npm run prisma:seed --workspace=apps/api      # seeds roles, permissions, bootstrap Super Admin
```

`prisma:seed` creates the bootstrap Super Admin account from `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD` env vars — set these before seeding, and **change the password immediately after first login** (or don't set a fallback password at all in production — the seed script's dev-only fallback is documented in `.env.example`).

Every migration in `apps/api/prisma/migrations/` was authored by hand-writing SQL rather than generated against a live database (documented, consistent constraint across every phase of this project) — they have been reviewed for correctness but **have never been applied to a real database until you run this step**. Treat this first `prisma:deploy` as the first real integration test of the schema; watch its output carefully.

---

## 5. Deploying with Docker Compose (recommended path)

```bash
# 1. Set every variable from §3 in a .env file at the repo root
cp .env.example .env
# edit .env with real values

# 2. Build and start everything
docker compose up -d --build

# 3. Apply migrations + seed (one-time, or after any new migration)
docker compose exec api npm run prisma:deploy
docker compose exec api npm run prisma:seed

# 4. Verify
docker compose logs -f api    # watch for the health-check to go green
curl http://localhost/api/v1/health
```

The `web` service's Dockerfile takes `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SITE_URL` as **build args** (see `docker-compose.yml`'s `web.build.args`) — sourced from `API_URL`/`WEB_URL` in your `.env`. Changing these requires `docker compose up -d --build web` (rebuild), not just `restart`.

Put Nginx (or your CDN) in front of port 80 for TLS termination and the final public domain.

---

## 6. Deploying with PM2 (alternative, direct-VPS path)

```bash
# 1. Build both apps
npm run build --workspace=apps/api
npm run build --workspace=apps/web

# 2. Set real .env files in apps/api/ and apps/web/ (or export env vars in your shell/systemd unit)

# 3. Apply migrations + seed (same as §4)
npm run prisma:deploy --workspace=apps/api
npm run prisma:seed --workspace=apps/api

# 4. Start under PM2
pm2 start infrastructure/pm2/ecosystem.config.js --env production
pm2 save
pm2 startup   # persist across server reboots
```

`ecosystem.config.js` runs both apps in PM2 cluster mode (2 instances each by default, override with `PM2_API_INSTANCES`/`PM2_WEB_INSTANCES`) for zero-downtime reloads (`pm2 reload sysa-api`) and basic horizontal use of multi-core hosts. Point Nginx at `localhost:3000`/`localhost:4000` the same way the Docker path does.

---

## 7. Razorpay Webhook Configuration (do this after deployment)

1. In the Razorpay Dashboard → Settings → Webhooks, add a new webhook pointing at:
   `https://yourdomain.org/api/v1/webhooks/razorpay`
2. Subscribe to exactly two events: `payment.captured` and `payment.failed` (the application does not handle any other event type — subscribing to others is harmless but unnecessary).
3. Razorpay will show you a **webhook secret** at creation time — this is `RAZORPAY_WEBHOOK_SECRET`, distinct from your API key secret. Set it in your `.env` and restart/redeploy the API.
4. Use Razorpay's "Send Test Webhook" feature to confirm delivery — the API should respond `200`. A `401` means the webhook secret doesn't match; check for copy-paste errors.

---

## 8. Post-Deployment Smoke Test

Run through this before considering the deployment live (see GO_LIVE_CHECKLIST.md for the full pre-launch list):

1. `curl https://yourdomain.org/api/v1/health` → `200`, status `ok` (not `degraded`).
2. Visit `https://yourdomain.org` — homepage loads with real content (not the error boundary — if you see "Something Went Wrong", the API can't reach the database).
3. Log in to `/login` with the Super Admin account, confirm the dashboard loads.
4. Make one real ₹1 test donation through the live Razorpay flow (use Razorpay's test-mode keys first, then a real small-amount live transaction) — confirm: order created → Checkout opens → payment completes → success page shows → receipt email arrives → admin `/admin/donations` shows the transaction with a downloadable receipt.
5. Submit the Contact form and confirm an email notification arrives (if `SMTP_*` is configured).

---

## 9. Rollback

- **Docker Compose**: `docker compose down`, redeploy the previous image tag, `docker compose up -d`.
- **PM2**: `pm2 reload sysa-api` / `sysa-web` after checking out the previous commit and rebuilding — PM2 cluster mode reload is zero-downtime.
- **Database**: this project's migrations are additive-only by convention (every migration in this codebase adds columns/tables, never drops data) — a code rollback should not require a corresponding database rollback in the common case. If a migration ever needs reverting, write and review a compensating migration rather than running `prisma migrate reset` against production data.
