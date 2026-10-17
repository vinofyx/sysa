import { PrismaClient } from '@prisma/client';

import { env } from '@config/env';
import { categorizeDbMessage } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';

/**
 * Prisma Client singleton.
 *
 * In development, Next.js-style hot-reload equivalents (tsx watch) can create multiple
 * PrismaClient instances against the same dev server process; we cache the instance on
 * globalThis to avoid exhausting the MySQL connection pool during local development.
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

// Prisma's event messages can include the database host, user, query text and
// query parameters (donor data), so only the target and a fixed category are
// logged — see db-diagnostics.ts.
function safePrismaEvent(e: unknown) {
  const event = (e && typeof e === 'object' ? e : {}) as { message?: unknown; target?: unknown };
  return {
    target: typeof event.target === 'string' ? event.target : undefined,
    category: categorizeDbMessage(typeof event.message === 'string' ? event.message : ''),
  };
}

prisma.$on('warn' as never, (e: unknown) => logger.warn('Prisma warning', safePrismaEvent(e)));
prisma.$on('error' as never, (e: unknown) => logger.error('Prisma error', safePrismaEvent(e)));

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
