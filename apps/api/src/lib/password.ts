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
