# ==============================================================================
# Sai Yadadri Seva Ashram Platform — Frontend (Next.js) Dockerfile
# Multi-stage build using Next.js standalone output, per
# design/15-Deployment-Architecture.md §5
# ==============================================================================

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --workspace=apps/web --include-workspace-root

# ---- Build ----
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY package.json package-lock.json* ./
WORKDIR /app/apps/web
RUN npm run build

# ---- Runtime (Next.js standalone output) ----
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S sysa && adduser -S sysa -G sysa

COPY --from=build /app/apps/web/public ./public
COPY --from=build --chown=sysa:sysa /app/apps/web/.next/standalone ./
COPY --from=build --chown=sysa:sysa /app/apps/web/.next/static ./apps/web/.next/static

USER sysa
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/web/server.js"]
