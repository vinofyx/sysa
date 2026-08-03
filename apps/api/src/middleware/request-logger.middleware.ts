import type { NextFunction, Request, Response } from 'express';

import { logger } from '@lib/logger';

/**
 * Lightweight structured HTTP request logger. Logs method/path/status/duration
 * for every request — the baseline observability layer referenced in
 * design/15-Deployment-Architecture.md §8 (Monitoring & Observability).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    });
  });

  next();
}
