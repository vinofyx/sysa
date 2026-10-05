import { randomBytes, createHash } from 'node:crypto';

import { OPAQUE_TOKEN_BYTES } from '@config/constants';

/**
 * Opaque, high-entropy tokens for refresh tokens, password-reset links, and
 * email-verification links. These are NOT JWTs — they're random values whose
 * SHA-256 hash is stored in the database, so a leaked database dump never
 * exposes a usable token (standard "store the hash, email/cookie the plaintext" pattern).
 */
export function generateOpaqueToken(): string {
  return randomBytes(OPAQUE_TOKEN_BYTES).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
