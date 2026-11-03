import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { env } from '@config/env';
import { logger } from '@lib/logger';
import { ApiError } from '@utils/api-error';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    correlationId?: string;
  };
}

/**
 * Centralized error-handling middleware — the single place error responses are shaped,
 * per design/13-API-Architecture.md §7 (Error Handling Architecture).
 * Must be registered LAST, after all routes.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  let statusCode = 500;
  let body: ErrorResponseBody = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(correlationId ? { correlationId } : {}),
    },
  };

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    body = {
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields,
        ...(correlationId ? { correlationId } : {}),
      },
    };
  } else if (err instanceof ZodError) {
    statusCode = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: err.flatten().fieldErrors as Record<string, string[]>,
        ...(correlationId ? { correlationId } : {}),
      },
    };
  } else if (err instanceof Error) {
    logger.error(err.message, {
      correlationId,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Never leak internal error details or database credentials in responses.
  if (statusCode === 500) {
    logger.error('Unhandled error', {
      correlationId,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
    // In all environments, keep database connection strings and initialization errors completely generic
    const isDbError =
      err instanceof Error &&
      (err.name.startsWith('Prisma') ||
        err.message.includes('database') ||
        err.message.includes("Can't reach database server"));
    if (env.NODE_ENV === 'development' && err instanceof Error && !isDbError) {
      body.error.message = err.message;
    } else {
      body.error.message = 'An unexpected error occurred';
    }
  } else if (statusCode >= 400) {
    logger.warn(`${body.error.code}: ${body.error.message}`, {
      correlationId,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json(body);
}
