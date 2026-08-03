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
  };
}

/**
 * Centralized error-handling middleware — the single place error responses are shaped,
 * per design/13-API-Architecture.md §7 (Error Handling Architecture).
 * Must be registered LAST, after all routes.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let body: ErrorResponseBody = {
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  };

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    body = { error: { code: err.code, message: err.message, fields: err.fields } };
  } else if (err instanceof ZodError) {
    statusCode = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: err.flatten().fieldErrors as Record<string, string[]>,
      },
    };
  } else if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  }

  // Never leak internal error details in production responses.
  if (statusCode === 500) {
    logger.error('Unhandled error', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
    if (env.NODE_ENV !== 'production' && err instanceof Error) {
      body.error.message = err.message;
    }
  } else if (statusCode >= 400) {
    logger.warn(`${body.error.code}: ${body.error.message}`, {
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json(body);
}
