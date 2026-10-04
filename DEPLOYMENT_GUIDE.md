# Deployment Guide

## Sai Yadadri Seva Ashram Platform

**Render is not required and must not be used.** Do not create a Render account or service. Do not point `NEXT_PUBLIC_API_URL` or `api-upstream.php` at `sysa.onrender.com`. `render.yaml` is an environment-variable catalog only.

This guide deploys the **existing** Node.js API (`api/`) next to the **existing** Hostinger Premium static website. It does not replace Prisma, Razorpay Checkout, webhooks, or `receipt.service.ts`.

---

## 1. Confirmed production architecture

```
https://sysa.in                 Hostinger Premium (Apache, static Next.js export)
  /                             website files (website/out or hostinger-site)
  /api/*                        api-proxy.php → Node.js API origin (api-upstream.php)
                                method, query, Authorization, raw POST body forwarded

Node.js 20 host (not Render)    persistent process, public HTTPS
  GET  /api/v1/health
  POST /api/v1/donations/initiate|verify
  POST /api/v1/webhooks/razorpay
  POST /api/v1/donations/razorpay-webhook   (same handler)
  GET/POST /api/v1/donations/:id/receipt|status|retry-*
        → Hostinger MySQL via DATABASE_URL (Remote MySQL if API is off-Hostinger)
```

| Layer      | Where                             | Notes                                                                                 |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| Website    | Hostinger Premium shared hosting  | Static Apache only. Cannot run this Express API.                                      |
| Public API | `https://sysa.in/api/v1`          | Browser and Razorpay use this URL. PHP proxy, not a fake static health page.          |
| Backend    | Any Node.js 20 host except Render | `BIND_HOST=0.0.0.0`, `process.env.PORT`, `npm start` / `npm run start:prod`           |
| Database   | Hostinger MySQL                   | Production `DATABASE_URL` only. Never `sysa_local_dev`. Never `prisma migrate reset`. |

Hostinger **Business / Cloud / VPS** can run Node.js; **Premium shared cannot**. The live site is Premium, so the API must live on a separate Node.js 20 host (or an upgraded Hostinger product). Minimum host: persistent Node 20 process, public HTTPS, inbound webhooks, outbound HTTPS, npm + Prisma, env vars, and a path to Hostinger MySQL.

---

## 2. Production go-live checklist

Do these in order. Secrets exist only on the Node host.

1. Choose a Node.js 20 host other than Render.
2. Deploy the existing `api/` app (monorepo root with workspace, or `api` as root directory).
3. Set production env from `api/.env.production.example` (never in the static website).
4. Confirm the process starts: `npm run build` then `npm start` (`node dist/server.js`). Production: `npm run start:prod` (`npx prisma migrate deploy && node dist/server.js`).
5. Confirm it listens on `process.env.PORT` and binds `BIND_HOST=0.0.0.0`.
6. In Hostinger hPanel → Databases → **Remote MySQL**, allow the Node host IP. Confirm `DATABASE_URL` connects. Do not use local `sysa_local_dev`.
7. Run `npx prisma migrate deploy` (or `start:prod`). Confirm these names in `_prisma_migrations`:
   - `20260905143000_add_receipt_email_and_whatsapp_status`
   - `20260905154500_add_receipt_pending_status_and_updated_at`
8. Hit the Node origin `GET /api/v1/health` — HTTP 200 JSON from Express, not HTML.
9. Attach HTTPS (and an optional custom domain) to the Node origin.
10. On Hostinger, copy `api-upstream.example.php` → `api-upstream.php` and `return 'https://YOUR-NODE-ORIGIN';` with **no** `/api` or `/api/v1` suffix.
11. Upload `.htaccess`, `api-proxy.php`, and the rebuilt site from `website/out/` (or `hostinger-site/`).
12. Confirm `curl -i https://sysa.in/api/v1/health` is JSON 200 from Node (via the proxy).
13. Confirm `/donate` uses Checkout (`initiate` → Razorpay Checkout → `verify`). It must not contain `payment-button.js` or `pl_TRewIwDkL2fw6u`.
14. Razorpay Dashboard webhook: `https://sysa.in/api/v1/webhooks/razorpay`, event `payment.captured`. Keep alias `/api/v1/donations/razorpay-webhook`. Secret only on the Node host.
15. Configure SMTP and Cloudinary on the Node host. WhatsApp is optional.
16. One **Razorpay test-mode** donation. Do not use live keys merely to test. Confirm one PDF, Cloudinary when configured, email, WhatsApp when configured, independent delivery statuses, no duplicate receipt on repeat verify/webhook.

---

## 2. Prerequisites

| Requirement                                 | Notes                                                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| MySQL 8.0+ (utf8mb4 / utf8mb4_0900_ai_ci)   | Production is Hostinger MySQL via `DATABASE_URL`. Docker Compose MySQL is local/dev only. See [MYSQL_MIGRATION_REPORT.md](MYSQL_MIGRATION_REPORT.md) |
| Node.js ≥ 20                                | Matches `engines.node` in `api/package.json`. Required on the API host.                                                                              |
| Cloudinary account                          | Set `CLOUDINARY_*` on the Node host. Receipt PDF upload is skipped when unset.                                                                       |
| Razorpay merchant account (test mode first) | Set `RAZORPAY_*` on the Node host only. Website Checkout uses the public key from `initiate`. Never live keys merely to test.                        |
| SMTP provider                               | Receipt email no-ops until `SMTP_*` / `EMAIL_FROM` or `SMTP_FROM` are set on the Node host.                                                          |
| HTTPS on the Node origin                    | Required for the Hostinger PHP proxy and Razorpay webhooks.                                                                                          |

---

## 3. Environment Variables

Copy `api/.env.example` for local development and `api/.env.production.example` for the Node host. **Never commit filled-in env files.** Never put server secrets in `NEXT_PUBLIC_*` or the static export.

There is **no `JWT_SECRET` variable**. Boot requires `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (each 32+ characters).

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
BIND_HOST=0.0.0.0
PORT=4000                              # the host may overwrite this; always read process.env.PORT
API_URL=https://sysa.in                # or https://api.sysa.in if the API uses a subdomain
WEB_URL=https://sysa.in
CORS_ORIGIN=https://sysa.in,https://www.sysa.in
COOKIE_DOMAIN=                         # leave unset when COOKIE_CROSS_SITE=true
COOKIE_CROSS_SITE=false                # true only if the browser calls a different API site
NEXT_PUBLIC_API_URL=https://sysa.in    # website build — no /api/v1 suffix
NEXT_PUBLIC_SITE_URL=https://sysa.in
```

**Important**: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are baked into the Next.js build at build time (they're also read directly by `next.config.ts` to construct the Content-Security-Policy's `connect-src`) — if you change them, you must **rebuild** the web image/app, not just restart it with new env vars.

---

## 4. Database Setup

```bash
# From api, with DATABASE_URL pointing at your production database
npm run prisma:deploy --workspace=api    # applies all committed migrations
npm run prisma:seed --workspace=api      # seeds roles, permissions, bootstrap Super Admin
```

`prisma:seed` creates the bootstrap Super Admin account from `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD` env vars — set these before seeding, and **change the password immediately after first login** (or don't set a fallback password at all in production — the seed script's dev-only fallback is documented in `.env.example`).

Every migration in `api/prisma/migrations/` was authored by hand-writing SQL rather than generated against a live database (documented, consistent constraint across every phase of this project) — they have been reviewed for correctness but **have never been applied to a real database until you run this step**. Treat this first `prisma:deploy` as the first real integration test of the schema; watch its output carefully.

---

## 5. Optional: Docker Compose (single VPS, not Hostinger Premium)

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

## 6. Optional: PM2 on a VPS

```bash
# 1. Build both apps
npm run build --workspace=api
npm run build --workspace=website

# 2. Set real .env files in api/ and website/ (or export env vars in your shell/systemd unit)

# 3. Apply migrations + seed (same as §4)
npm run prisma:deploy --workspace=api
npm run prisma:seed --workspace=api

# 4. Start under PM2
pm2 start infrastructure/pm2/ecosystem.config.js --env production
pm2 save
pm2 startup   # persist across server reboots
```

`ecosystem.config.js` runs both apps in PM2 cluster mode (2 instances each by default, override with `PM2_API_INSTANCES`/`PM2_WEB_INSTANCES`) for zero-downtime reloads (`pm2 reload sysa-api`) and basic horizontal use of multi-core hosts. Point Nginx at `localhost:3000`/`localhost:4000` the same way the Docker path does.

---

## 7. Razorpay Webhook Configuration (do this after deployment)

1. In the Razorpay Dashboard → Settings → Webhooks, set the webhook URL to:
   `https://sysa.in/api/v1/webhooks/razorpay`
   (fallback if the API is only on a subdomain: `https://api.sysa.in/api/v1/webhooks/razorpay`)
2. Subscribe to `payment.captured` (required). `payment.failed` is optional. The alias `POST /api/v1/donations/razorpay-webhook` uses the same handler — keep it working; do not point Razorpay at Render.
3. Razorpay will show you a **webhook secret** at creation time — this is `RAZORPAY_WEBHOOK_SECRET`, distinct from your API key secret. Set it only in the API host environment. Never put it in the static website.
4. Use Razorpay's "Send Test Webhook" feature to confirm delivery — the API should respond `200`. A `401` means the webhook secret doesn't match; check for copy-paste errors.

---

## 8. Post-Deployment Smoke Test

Run through this before considering the deployment live (see GO_LIVE_CHECKLIST.md for the full pre-launch list):

1. `curl https://sysa.in/api/v1/health` → HTTP 200 and JSON from the Node.js API (not an HTML 404). Example body: `{"status":"ok", ...}`.
2. Visit `https://sysa.in` — homepage loads.
3. Donate uses Razorpay **Checkout** (`initiate` → Checkout → `verify`). Do not restore the Payment Button (`payment-button.js` / `pl_TRewIwDkL2fw6u`).
4. Make one **Razorpay test-mode** donation — confirm: order created → Checkout opens → payment captured → success page → one PDF receipt → email/WhatsApp statuses stored independently. Do not use live Razorpay keys merely to test.
5. Confirm duplicate `verify` and duplicate webhook do not create a second receipt (`paymentGatewayRef` uniqueness).

---

## 9. Rollback

- **Docker Compose**: `docker compose down`, redeploy the previous image tag, `docker compose up -d`.
- **PM2**: `pm2 reload sysa-api` / `sysa-web` after checking out the previous commit and rebuilding — PM2 cluster mode reload is zero-downtime.
- **Database**: this project's migrations are additive-only by convention (every migration in this codebase adds columns/tables, never drops data) — a code rollback should not require a corresponding database rollback in the common case. If a migration ever needs reverting, write and review a compensating migration rather than running `prisma migrate reset` against production data.

---

## 10. Deploy the Node.js API (Hostinger or any non-Render host)

Use the scripts already in `api/package.json`. Do not invent a second backend.

```bash
npm install
npx prisma generate
npx prisma migrate deploy    # never prisma migrate reset
npm run build
npm start                    # node dist/server.js — reads process.env.PORT
```

Production one-shot (migrate then serve):

```bash
npm run start:prod --workspace=api
```

From the monorepo root (Hostinger Git deploy of the whole repo):

| Panel field     | Value                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js version | 20                                                                                                                                    |
| Framework       | Express / Other                                                                                                                       |
| Build command   | `HUSKY=0 npm ci --workspace=api --include-workspace-root && npm run prisma:generate --workspace=api && npm run build --workspace=api` |
| Start command   | `npm run start:prod --workspace=api`                                                                                                  |
| Entry file      | `api/dist/server.js`                                                                                                                  |
| Bind            | `BIND_HOST=0.0.0.0` (default) and the platform `PORT`                                                                                 |

If the panel supports a **Root directory** of `api`, use that package’s `build` / `start` / `start:prod` instead.

`bcrypt` needs a native addon. Hostinger Node.js Web Apps usually provide it; a raw VPS needs build tools (`python3`, `make`, `g++`) or use `api/Dockerfile`.

### 10.1 Hostinger MySQL

Set `DATABASE_URL` only as an environment variable. Do not hardcode credentials. Do not point production at local `sysa_local_dev`.

- Same Hostinger account as MySQL: use the host shown in hPanel (often `localhost` from a Hostinger Node app, or `srv….hstgr.io` from outside).
- API on a **different** machine: hPanel → Databases → **Remote MySQL** → allow the Node host IP. Connection refused / Prisma `P1000` means remote access is not enabled or the password/host is wrong.

Apply pending receipt migrations (additive; safe; never `migrate reset`):

- `20260905143000_add_receipt_email_and_whatsapp_status`
- `20260905154500_add_receipt_pending_status_and_updated_at`

```bash
cd api
npx prisma migrate deploy
```

Success: both names appear in `_prisma_migrations`.

### 10.2 Environment variables (API host — server-side only)

Required to boot: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

Required for donations/receipts as used in production:

```
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD
SMTP_FROM or EMAIL_FROM
CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET
```

Optional (fail-open; donation still succeeds): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, SMS_* vars.

Never put Razorpay/SMTP/WhatsApp/Cloudinary secrets or `DATABASE_URL` in the static website or any `NEXT_PUBLIC_*` variable.

---

## 11. Hostinger static website

Keep the existing static export on Hostinger. Rebuild after any `NEXT_PUBLIC_*` change:

```bash
NEXT_PUBLIC_API_URL=https://sysa.in NEXT_PUBLIC_SITE_URL=https://sysa.in npm run build:static --workspace=website
```

Upload `website/out/` to the Hostinger document root (File Manager or FTP). Include:

- `.htaccess` (rewrites `/api/*` to `api-proxy.php`)
- `api-proxy.php`
- `api-upstream.example.php` — copy on the server to `api-upstream.php` and return the Node origin only, for example `return 'https://api.example-host.com';` (no `/api` suffix). Leave it empty until the Node host is live.

The proxy forwards HTTP method, query string (including `?token=`), Authorization (Bearer), Content-Type, and the raw POST body (required for Razorpay webhook HMAC). It rejects Render hostnames. It does not contain API secrets.

Same-origin (preferred): browser `NEXT_PUBLIC_API_URL=https://sysa.in` → `/api/v1/...` → PHP proxy → Node host. Then `COOKIE_CROSS_SITE=false`.

---

## 12. Choosing the Node.js host (not Render)

Hostinger Premium shared hosting cannot run this API. Pick any other Node.js 20 provider (Hostinger Business/Cloud/VPS, or another vendor). Do not use Render.

- **Business / Cloud (hPanel Web Apps):** Express/Other, Node 20, env from `api/.env.production.example`, build/start from §10.
- **VPS:** Node 20, `npm ci`, `npm run build --workspace=api`, `npx prisma migrate deploy`, PM2 or Docker. If nginx proxies `/api` to `127.0.0.1:$PORT` on the same hostname, the PHP proxy is unused.
- **Separate PaaS:** same start commands; set `api-upstream.php` to that HTTPS origin.

Health check (must come from Node, not Apache):

```bash
curl -i https://sysa.in/api/v1/health
```
