import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '@utils/api-error';

/**
 * Catch-all for unmatched routes — forwards a consistent 404 through the
 * centralized error handler rather than letting Express emit its default HTML error page.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
