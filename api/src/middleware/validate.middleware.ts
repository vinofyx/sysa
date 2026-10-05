import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Generic request-validation middleware — parses `req.body`/`query`/`params`
 * against the given Zod schema(s) and replaces them with the parsed (and
 * coerced/defaulted) result, or forwards a ZodError to the centralized error
 * handler (which shapes it into the standard `VALIDATION_ERROR` envelope —
 * see src/middleware/error-handler.middleware.ts).
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      next(error);
    }
  };
}
