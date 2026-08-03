import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '@lib/jwt';
import { prisma } from '@lib/prisma';
import { ACCESS_TOKEN_COOKIE } from '@config/constants';
import { ApiError } from '@utils/api-error';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the access token (read from the httpOnly cookie, falling back to an
 * `Authorization: Bearer` header for API clients that can't use cookies — e.g.
 * Swagger "Try it out") and confirms the underlying session is still active.
 *
 * The session check is what makes logout / logout-all-devices take effect
 * immediately rather than waiting out the access token's remaining lifetime —
 * see the `Session` model doc-comment in prisma/schema.prisma and
 * design/13-API-Architecture.md §4.1.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  const header = req.headers.authorization;
  const headerToken = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  const token = cookieToken ?? headerToken;

  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = verifyAccessToken(token);

    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: {
        adminUser: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return next(ApiError.unauthorized('Session has been revoked or has expired'));
    }

    if (!session.adminUser.active) {
      return next(ApiError.unauthorized('Account is deactivated'));
    }

    req.user = {
      id: session.adminUser.id,
      email: session.adminUser.email,
      name: session.adminUser.name,
      roleId: session.adminUser.roleId,
      roleName: session.adminUser.role.name,
      permissions: session.adminUser.role.rolePermissions.map((rp) => rp.permission.code),
      sessionId: session.id,
    };

    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}
