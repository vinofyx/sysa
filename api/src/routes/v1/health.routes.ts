import { Router, type Request, type Response } from 'express';

import { diagnoseDbError, type DbErrorCategory } from '@lib/db-diagnostics';
import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

export const healthRouter = Router();

/** Health probes run often; log a failure when its kind changes, or at most
 * once a minute while it persists. */
const REPEAT_LOG_MS = 60_000;
let lastLogged: { key: string; at: number } | null = null;

/**
 * GET /api/v1/health
 *
 * Liveness/readiness probe used by uptime monitoring, load balancers, and CI smoke tests
 * (see design/15-Deployment-Architecture.md §8 and §4 "SmokeTest" pipeline step).
 * Reports API process health plus database connectivity. On a database
 * failure the response carries only a fixed category (e.g. `auth_failed`) —
 * never the error message, host, user or connection string.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  let databaseStatus: 'ok' | 'error' = 'ok';
  let databaseError: DbErrorCategory | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseStatus = 'error';
    const diagnosis = diagnoseDbError(error);
    databaseError = diagnosis.category;
    const key = `${diagnosis.code}:${diagnosis.category}`;
    const now = Date.now();
    if (!lastLogged || lastLogged.key !== key || now - lastLogged.at >= REPEAT_LOG_MS) {
      lastLogged = { key, at: now };
      logger.error('Health check: database unavailable', { ...diagnosis });
    }
  }

  const body = {
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    checks: {
      database: databaseStatus,
      ...(databaseError ? { databaseError } : {}),
    },
    version: process.env.npm_package_version ?? '0.1.0',
  };

  res.status(databaseStatus === 'ok' ? 200 : 503).json(body);
});
