# SYSA API Production Deployment Manifest (Hostinger Node.js)

**Generated:** 2026-10-28  
**Project:** Sai Yadadri Seva Ashram (SYSA) Platform  
**Target Domain:** `api.sysa.in` (and reverse proxied via `sysa.in/api/*`)  
**Target Platform:** Hostinger Node.js Web App  
**Node.js Runtime:** Node.js 20.x  
**Git Branch:** `fix/health-check-alias`  
**Git Commit:** `4768965ae8dcc5519ce9e5649d68ed3f615fb67c`  
**Archive File:** `sysa-api-hostinger.zip`

---

## 1. Summary of Changes Included

This deployment package contains the fix for the production health check endpoint:

- **`api/src/routes/v1/health.routes.ts`**:
  - Registers `GET /api/v1/health/check` as a direct alias for the canonical `GET /api/v1/health`.
  - Both paths invoke the shared `healthHandler` function which conducts a live `SELECT 1` database probe.
  - Resolves the `404 NOT_FOUND` error returned to external monitoring services and uptime checkers.
- **`api/src/tests/db-diagnostics.test.ts`**:
  - Added unit test coverage for the `/check` alias (HTTP 200 on DB success, HTTP 503 degraded on DB failure, and verification that no sensitive database credentials or hostnames are leaked).
- **Pre-compiled Production Artifacts**:
  - `api/dist/routes/v1/health.routes.js` and `api/dist/server.js` are fully compiled and verified.
- **Database & Safety**:
  - No migrations are modified or deleted; pending migrations remain additive-only.
  - No database resets or destructive actions.

---

## 2. Hostinger hPanel Configuration

Configure the Node.js Web App in Hostinger hPanel with the following settings:

| Setting                      | Value                                                                                                                                 | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Node.js Version**          | `20` (or `20.x`)                                                                                                                      | Matches engine requirement `>=20.0.0`                                    |
| **Application Root**         | `/` (or root of deployed archive)                                                                                                     | Monorepo root preserving workspace structure                             |
| **Application Startup File** | `api/dist/server.js`                                                                                                                  | Compiled Express entrypoint                                              |
| **Build Command**            | `HUSKY=0 npm ci --workspace=api --include-workspace-root && npm run prisma:generate --workspace=api && npm run build --workspace=api` | Rebuilds Prisma client and TypeScript if executed on server              |
| **Start Command**            | `npm run start:prod --workspace=api` (or `node api/dist/server.js`)                                                                   | Executes database migrations (`prisma migrate deploy`) then boots server |
| **Network Bind**             | `BIND_HOST=0.0.0.0`                                                                                                                   | Listens on all interfaces behind Hostinger reverse proxy                 |
| **Port**                     | Injected automatically by Hostinger `PORT`                                                                                            | Falls back to `4000` if unset                                            |

---

## 3. Environment Variables (Names Only)

> **SECURITY NOTE**: Secret values must **NEVER** be committed to code or included in archives. Set these directly in the Hostinger hPanel Node.js **Environment Variables** interface.

### 3.1 Required for Process Boot

- `NODE_ENV` (Set to `production`)
- `PORT` (Provided by Hostinger)
- `BIND_HOST` (Set to `0.0.0.0`)
- `DATABASE_URL` (Hostinger MySQL connection URI, host is usually `localhost` or `srv*.hstgr.io`)
- `JWT_ACCESS_SECRET` (Minimum 32 characters)
- `JWT_REFRESH_SECRET` (Minimum 32 characters, distinct from access secret)
- `API_URL` (Public URL, e.g., `https://api.sysa.in` or `https://sysa.in`)
- `WEB_URL` (Frontend URL, e.g., `https://sysa.in`)
- `CORS_ORIGIN` (Allowed origins, e.g., `https://sysa.in,https://www.sysa.in`)
- `COOKIE_CROSS_SITE` (`true` when API is on `api.sysa.in` and website is on `sysa.in`)

### 3.2 Required for Payments & Notifications (Donation Flow)

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER` (or `SMTP_USERNAME`)
- `SMTP_PASSWORD`
- `SMTP_FROM` (or `EMAIL_FROM`)
- `ORG_RECEIPT_EMAIL`
- `NOTIFICATIONS_MODE` (`live` for sending, `dry_run` for staging)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 3.3 Optional / Feature Specific

- `DONATION_TOKEN_SECRET`
- `DONATION_TOKEN_TTL_DAYS`
- `DONATION_TOKENS_ISSUED_AFTER`
- `DONATION_TOKEN_LEGACY_UNTIL`
- `MSG91_AUTHKEY`
- `MSG91_WHATSAPP_NUMBER`
- `MSG91_WHATSAPP_INTEGRATED_NUMBER`
- `MSG91_WABA_ID`
- `MSG91_WHATSAPP_TEMPLATE_NAME`
- `MSG91_WHATSAPP_TEMPLATE_ID`
- `MSG91_WHATSAPP_TEMPLATE_NAMESPACE`
- `MSG91_WHATSAPP_TEMPLATE_APPROVED`
- `MSG91_WHATSAPP_TEMPLATE_LANGUAGE`
- `MSG91_WEBHOOK_SECRET`
- `SMS_SENDER_ID`
- `SMS_DLT_TEMPLATE_ID`
- `SMS_PROVIDER_API_KEY`
- `SMS_PROVIDER_API_URL`
- `SMS_PROVIDER_TEMPLATE_VARS`
- `SMS_DLT_CONTENT_VERIFIED`
- `SMS_DLT_PRINCIPAL_ENTITY_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

---

## 4. Archive Contents & Workspace Structure

The archive preserves the monorepo workspace structure without bundling extraneous files or secrets:

```
sysa-api-hostinger.zip
├── .husky/
│   └── install.mjs                 # Safe npm prepare hook for production
├── .nvmrc                          # Node version indicator (20)
├── DEPLOYMENT_MANIFEST.md          # This deployment manifest
├── package-lock.json               # Monorepo lockfile
├── package.json                    # Monorepo root package manifest
├── website/
│   └── package.json                # Workspace link (no website sources)
└── api/
    ├── package.json                # Backend API manifest
    ├── tsconfig.json               # TypeScript base configuration
    ├── tsconfig.build.json         # Production build configuration
    ├── dist/                       # Pre-compiled JavaScript runtime output
    │   ├── server.js               # Entrypoint (dist/server.js)
    │   ├── app.js
    │   ├── routes/v1/health.routes.js # Includes GET / and GET /check
    │   ├── assets/
    │   ├── config/
    │   ├── integrations/
    │   ├── lib/
    │   ├── middleware/
    │   └── ...
    ├── prisma/
    │   ├── schema.prisma           # Complete database schema
    │   └── migrations/             # All additive migrations
    └── src/                        # Complete TypeScript source code
        ├── server.ts
        ├── app.ts
        ├── routes/v1/health.routes.ts # Source with /check alias
        ├── tests/db-diagnostics.test.ts
        └── ...
```

### Excluded Items (Verified Clean)

- ❌ No `.env`, `.env.local`, `.env.production`
- ❌ No `node_modules/` (installed on server via `npm ci`)
- ❌ No `.git/` or `.github/`
- ❌ No `.claude/` or local IDE files
- ❌ No test scripts or database dumps (`test-db-connection.cjs`, `*.pem`, `*.key`)
- ❌ No website frontend source code or static exports (`website/src`, `website/out`)

---

## 5. Verification Checklist

Prior to packaging:

- **TypeScript Compilation (`tsc`)**: Passed (0 errors).
- **Unit Tests (`npm run test --workspace=api`)**: 201 passed, 0 failed.
- **Linter (`eslint`)**: Passed (0 errors).
- **Static Analysis**: Verified that `/check` resolves to `healthHandler` alongside `/`.
