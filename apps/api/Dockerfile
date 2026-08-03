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
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace=apps/api --include-workspace-root

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json package-lock.json* ./
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ---- Production dependencies only ----
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api

RUN addgroup -S sysa && adduser -S sysa -G sysa

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY apps/api/package.json ./package.json

RUN npx prisma generate

RUN mkdir -p logs uploads && chown -R sysa:sysa /app
USER sysa

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
