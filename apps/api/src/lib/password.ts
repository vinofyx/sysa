import { randomBytes } from 'node:crypto';

import bcrypt from 'bcrypt';

import { env } from '@config/env';

/**
 * Password hashing utilities (SEC-AUTH-01, documentation/12-Security-Requirements.md).
 * Never store or compare plaintext passwords.
 */

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Generates a random, policy-compliant password that is never revealed to anyone —
 * used only as an unusable placeholder when a Super Admin creates a new admin
 * account. The new user sets their real password via the "Forgot Password" flow
 * after verifying their email (see src/services/user.service.ts createUser).
 */
export function generateRandomPassword(): string {
  const random = randomBytes(24).toString('base64url');
  // Guarantee the complexity regex is satisfied regardless of what randomBytes produced.
  return `Aa1!${random}`;
}
