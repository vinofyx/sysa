import { Router, type Request, type Response } from 'express';

import { prisma } from '@lib/prisma';

export const healthRouter = Router();

/**
 * GET /api/v1/health
 *
 * Liveness/readiness probe used by uptime monitoring, load balancers, and CI smoke tests
 * (see design/15-Deployment-Architecture.md §8 and §4 "SmokeTest" pipeline step).
 * Reports API process health plus database connectivity.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  const startedAt = Date.now();
  let databaseStatus: 'ok' | 'error' = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = 'error';
  }

  const body = {
    status: databaseStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    checks: {
      database: databaseStatus,
    },
    version: process.env.npm_package_version ?? '0.1.0',
  };

  res.status(databaseStatus === 'ok' ? 200 : 503).json(body);
});
