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
 * Shared handler for both health routes (see below).
 *
 * Performs a live `SELECT 1` against the database and returns a JSON body
 * with `status`, `timestamp`, `uptimeSeconds`, `responseTimeMs`, `checks`,
 * and `version`. HTTP 200 when the database answers; 503 when it does not.
 * Only a fixed error category is ever returned — never the error message,
 * host, username, or connection string.
 */
async function healthHandler(_req: Request, res: Response): Promise<void> {
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
}

/**
 * GET /api/v1/health
 *
 * Canonical liveness/readiness probe used by uptime monitoring, load
 * balancers, and CI smoke tests (see design/15-Deployment-Architecture.md
 * §8 and §4 "SmokeTest" pipeline step).
 */
healthRouter.get('/', healthHandler);

/**
 * GET /api/v1/health/check
 *
 * Alias for GET /api/v1/health — resolves NOT_FOUND that external monitors
 * and integration consumers receive when calling the `/check` sub-path.
 * Both paths share the identical handler; the canonical path remains `/`.
 */
healthRouter.get('/check', healthHandler);
