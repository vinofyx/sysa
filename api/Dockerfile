# ==============================================================================
# Sai Yadadri Seva Ashram Platform — Backend API Dockerfile
# Multi-stage build per design/15-Deployment-Architecture.md §5
# ==============================================================================

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Dependencies (full, incl. dev, for build) ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY api/package.json ./api/package.json
# --ignore-scripts skips root Husky `prepare` inside the image build.
RUN npm ci --workspace=api --include-workspace-root --ignore-scripts

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api ./api
COPY package.json package-lock.json* ./
WORKDIR /app/api
RUN npx prisma generate
RUN npm run build

# ---- Production dependencies only ----
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY api/package.json ./api/package.json
RUN npm ci --workspace=api --include-workspace-root --omit=dev --ignore-scripts

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app/api

RUN addgroup -S sysa && adduser -S sysa -G sysa

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/api/node_modules ./node_modules
COPY --from=build /app/api/dist ./dist
COPY --from=build /app/api/prisma ./prisma
COPY api/package.json ./package.json

RUN npx prisma generate

RUN mkdir -p logs uploads && chown -R sysa:sysa /app
USER sysa

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const p=process.env.PORT||4000;require('http').get('http://127.0.0.1:'+p+'/api/v1/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# `prisma migrate deploy` (never `migrate reset`/`db push`) applies only the
# migrations not yet recorded in `_prisma_migrations` — safe to run on every
# container start, including redeploys with no new migrations (a no-op).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
