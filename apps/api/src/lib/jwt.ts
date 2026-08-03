import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@config/env';

/**
 * JWT signing/verification utilities — foundational auth primitives only.
 * Wiring into actual login/session endpoints is deferred to the feature-development
 * phase per documentation/10-Roles-and-Permissions.md and design/13-API-Architecture.md §4.
 */

export interface AccessTokenPayload {
  sub: string; // admin_user.id or donor.id
  role?: string;
  type: 'admin' | 'donor';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AccessTokenPayload;
}
