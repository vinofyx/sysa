import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@config/env';

/**
 * Access-token JWT signing/verification.
 *
 * Refresh tokens are NOT JWTs in this system — they are opaque, hashed, database-backed
 * tokens (see src/lib/tokens.ts + the `Session` Prisma model) so they can be rotated and
 * revoked immediately (logout / logout-all-devices). The access token's `sid` claim ties
 * it back to that session row: every authenticated request re-checks the session is still
 * active, giving immediate revocation semantics despite using a stateless JWT for the
 * access token itself — see design/13-API-Architecture.md §4.1.
 */
export interface AccessTokenPayload {
  sub: string; // admin_user.id
  sid: string; // session.id — used to check the session hasn't been revoked
  role: string; // role name, for lightweight client-side UI decisions (never trusted for authz)
  type: 'admin';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
