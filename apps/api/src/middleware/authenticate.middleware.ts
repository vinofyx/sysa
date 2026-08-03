import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken, type AccessTokenPayload } from '@lib/jwt';
import { ApiError } from '@utils/api-error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Verifies the Bearer JWT on protected routes and attaches the decoded payload to `req.user`.
 *
 * This is foundational auth wiring only. Role/permission enforcement per the matrix in
 * documentation/10-Roles-and-Permissions.md (RBAC middleware) is implemented alongside the
 * actual admin feature routes in the next development phase — see DEVELOPMENT_PROGRESS.md.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized());
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}
