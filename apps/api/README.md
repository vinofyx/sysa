# @sysa/api — Backend

Express + TypeScript backend API for the Sai Yadadri Seva Ashram Platform.

See the [repository root README](../../README.md) for full setup instructions, and [`design/13-API-Architecture.md`](../../design/13-API-Architecture.md) for the layered architecture this app implements.

## Scripts

| Script                      | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `npm run dev`               | Start the API in watch mode (tsx) on port 4000                 |
| `npm run build`             | Compile TypeScript to `dist/` (with path-alias rewriting)      |
| `npm run start`             | Run the compiled build                                         |
| `npm run lint` / `lint:fix` | ESLint                                                         |
| `npm run typecheck`         | TypeScript check (no emit)                                     |
| `npm run prisma:generate`   | Generate the Prisma client                                     |
| `npm run prisma:migrate`    | Create/apply a dev migration                                   |
| `npm run prisma:studio`     | Open Prisma Studio                                             |
| `npm run prisma:seed`       | Seed RBAC roles/permissions + donation category reference data |

## Structure

```
src/
├── app.ts                 # Express app factory (middleware pipeline, route mounting)
├── server.ts               # Entrypoint — listens, graceful shutdown, process error handlers
├── config/env.ts            # Zod-validated environment configuration
├── lib/                      # logger (Winston), prisma client, jwt, password hashing
├── middleware/                # auth, error handling, request logging, 404
├── routes/v1/                  # API v1 router — currently only /health
├── integrations/                # Cloudinary, email (Nodemailer) — foundational clients
├── services/, repositories/, jobs/   # Empty — populated in the feature-development phase
└── utils/api-error.ts             # Standard ApiError class
prisma/
├── schema.prisma            # Full data model (design/12-Database-ERD.md)
└── seed.ts                    # RBAC + donation category seed data
```

## What's Implemented vs. Deferred

This is a **foundation-only** build. Implemented: environment validation, logging, error handling, the Express middleware pipeline, API versioning (`/api/v1`), the health-check endpoint, the full Prisma schema, and foundational (not-yet-wired-up) auth/storage/email utilities.

**Deferred to the next phase:** all business routes (donations, content, volunteers, admin/* — see `documentation/13-API-Requirements.md` for the full planned endpoint catalogue), RBAC permission-enforcement middleware wired to real routes, and the actual Razorpay/Cloudinary/Nodemailer integration logic beyond client initialization.

See [`../../DEVELOPMENT_PROGRESS.md`](../../DEVELOPMENT_PROGRESS.md) for the full status.
