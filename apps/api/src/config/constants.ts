/**
 * Cross-cutting policy constants for authentication — kept separate from `env.ts`
 * because these are fixed security decisions, not per-deployment configuration
 * (per documentation/12-Security-Requirements.md §3, §5).
 */

/** Minimum password length, independent of the complexity regex below. */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Requires at least one lowercase letter, one uppercase letter, one digit, and one
 * special character. Enforced on: change-password, reset-password, and the seed
 * script's bootstrap account (see prisma/seed.ts).
 */
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_POLICY_DESCRIPTION = `At least ${PASSWORD_MIN_LENGTH} characters, including one uppercase letter, one lowercase letter, one number, and one special character.`;

/** Auth cookie names — httpOnly, see src/lib/cookies.ts. */
export const ACCESS_TOKEN_COOKIE = 'sysa_access_token';
export const REFRESH_TOKEN_COOKIE = 'sysa_refresh_token';
/** Donor session cookie (Phase 7 donation-history login) — separate from the
 * admin cookies above so a donor session can never be confused with one. */
export const DONOR_TOKEN_COOKIE = 'sysa_donor_token';

/** Session/token size (bytes of randomness before hex/base64 encoding). */
export const OPAQUE_TOKEN_BYTES = 32;
