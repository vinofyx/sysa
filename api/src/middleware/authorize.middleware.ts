import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '@utils/api-error';

/**
 * Permission-based authorization — must run after `authenticate`.
 *
 * Permissions are entirely database-driven (Role → RolePermission → Permission,
 * see prisma/schema.prisma and prisma/seed.ts) rather than hardcoded per-role
 * checks, so an operator can reassign what a role can do (via the Role API)
 * without a code change or redeploy — the "permissions must be configurable"
 * requirement for this phase.
 *
 * Usage: `router.get('/users', authenticate, requirePermission('users:view'), handler)`
 * A route may require more than one permission by passing multiple codes — the
 * caller must hold ALL of them (AND semantics), matching how the seeded roles
 * are composed (e.g. Admin = many individual permissions, not one umbrella flag).
 */
export function requirePermission(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const missing = codes.filter((code) => !req.user!.permissions.includes(code));

    if (missing.length > 0) {
      return next(ApiError.forbidden(`Missing required permission(s): ${missing.join(', ')}`));
    }

    next();
  };
}

/** Passes if the caller holds ANY of the listed permissions (OR semantics). */
export function requireAnyPermission(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const hasAny = codes.some((code) => req.user!.permissions.includes(code));

    if (!hasAny) {
      return next(ApiError.forbidden(`Requires at least one of: ${codes.join(', ')}`));
    }

    next();
  };
}
