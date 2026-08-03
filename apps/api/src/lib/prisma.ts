import { PrismaClient } from '@prisma/client';

import { env } from '@config/env';
import { logger } from '@lib/logger';

/**
 * Prisma Client singleton.
 *
 * In development, Next.js-style hot-reload equivalents (tsx watch) can create multiple
 * PrismaClient instances against the same dev server process; we cache the instance on
 * globalThis to avoid exhausting the Postgres connection pool during local development.
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

prisma.$on('warn' as never, (e: unknown) => logger.warn('Prisma warning', { event: e }));
prisma.$on('error' as never, (e: unknown) => logger.error('Prisma error', { event: e }));

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
