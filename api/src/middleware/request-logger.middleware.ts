import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { logger } from '@lib/logger';

/**
 * Lightweight structured HTTP request logger. Logs method/path/status/duration
 * and correlationId for every request — the baseline observability layer referenced in
 * design/15-Deployment-Architecture.md §8 (Monitoring & Observability).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const headers = req.headers || {};
  const correlationId =
    (headers['x-correlation-id'] as string) ||
    (headers['x-request-id'] as string) ||
    crypto.randomUUID();

  (req as Request & { correlationId?: string }).correlationId = correlationId;
  if (typeof res.setHeader === 'function') {
    res.setHeader('x-correlation-id', correlationId);
  }

  const start = process.hrtime.bigint();

  if (typeof res.on === 'function') {
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const statusCode = res.statusCode || 200;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

      logger.log(
        level,
        `${req.method || 'GET'} ${req.originalUrl || req.url || '/'} ${statusCode}`,
        {
          correlationId,
          durationMs: Math.round(durationMs * 100) / 100,
          ip: req.ip,
        },
      );
    });
  }

  next();
}
