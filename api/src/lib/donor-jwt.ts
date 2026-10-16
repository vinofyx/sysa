import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@config/env';

/**
 * Donor session JWT — deliberately separate from `AccessTokenPayload`
 * (lib/jwt.ts) so a donor token can never be mistaken for an admin token by
 * the admin `authenticate` middleware (which checks `type: 'admin'` payloads
 * only). Stateless (no DB-backed session row) — appropriate for a low-risk,
 * read-only convenience feature (design/13-API-Architecture.md §4.2), not a
 * security-critical account system.
 */
export interface DonorTokenPayload {
  sub: string; // donor.id
  type: 'donor';
}

const DONOR_TOKEN_TTL = '24h';

export function signDonorToken(donorId: string): string {
  return jwt.sign({ sub: donorId, type: 'donor' } as DonorTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: DONOR_TOKEN_TTL,
  } as SignOptions);
}

export function verifyDonorToken(token: string): DonorTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as DonorTokenPayload;
  if (payload.type !== 'donor') {
    throw new Error('Not a donor token');
  }
  return payload;
}

/**
 * Unguessable, stateless per-donation access token — lets a guest (no donor
 * account) poll payment status, retry a failed payment, or download their
 * receipt using only the link/donation id returned at checkout time, without
 * requiring the donor-OTP login flow for a single one-off donation.
 *
 * Format `v2.<issued-at seconds>.<hmac>`: the HMAC covers the purpose, the
 * donation id and the issue time, under its own key (DONATION_TOKEN_SECRET,
 * else a key derived from JWT_ACCESS_SECRET for this purpose only). A token
 * expires DONATION_TOKEN_TTL_DAYS after issue, and every token issued before
 * DONATION_TOKENS_ISSUED_AFTER is revoked — no database state needed.
 */
const DONATION_TOKEN_VERSION = 'v2';
const DAY_MS = 24 * 60 * 60 * 1000;

function donationTokenKey(): Buffer {
  return env.DONATION_TOKEN_SECRET
    ? Buffer.from(env.DONATION_TOKEN_SECRET)
    : createHmac('sha256', env.JWT_ACCESS_SECRET).update('sysa:donation-access-token:v2').digest();
}

function donationTokenMac(donationId: string, issuedAtSeconds: number): string {
  return createHmac('sha256', donationTokenKey())
    .update(`donation-access:${DONATION_TOKEN_VERSION}:${donationId}:${issuedAtSeconds}`)
    .digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Tokens issued before DONATION_TOKENS_ISSUED_AFTER are revoked. */
function revokedByCutoff(issuedAtMs: number): boolean {
  const cutoff = env.DONATION_TOKENS_ISSUED_AFTER;
  // Issue times are whole seconds; compare at the same precision so a link
  // minted in the cutoff's own second is not wrongly revoked.
  return !!cutoff && issuedAtMs < Math.floor(cutoff.getTime() / 1000) * 1000;
}

export function signDonationAccessToken(donationId: string, now: Date = new Date()): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return `${DONATION_TOKEN_VERSION}.${issuedAt}.${donationTokenMac(donationId, issuedAt)}`;
}

/** The pre-v2 token: HMAC(JWT_ACCESS_SECRET, donationId), with no expiry.
 * Honoured only until DONATION_TOKEN_LEGACY_UNTIL, and never once a
 * revocation cutoff is set (its issue time is unknown). */
function verifyLegacyDonationToken(donationId: string, token: string, now: Date): boolean {
  if (now.getTime() >= env.DONATION_TOKEN_LEGACY_UNTIL.getTime()) return false;
  if (env.DONATION_TOKENS_ISSUED_AFTER) return false;
  const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(donationId).digest('hex');
  return safeEqual(expected, token);
}

export function verifyDonationAccessToken(
  donationId: string,
  token: string,
  now: Date = new Date(),
): boolean {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== DONATION_TOKEN_VERSION) {
    return /^[0-9a-f]{64}$/.test(token) && verifyLegacyDonationToken(donationId, token, now);
  }
  if (!/^\d{1,12}$/.test(parts[1])) return false;
  const issuedAtSeconds = Number(parts[1]);
  const issuedAtMs = issuedAtSeconds * 1000;
  if (!safeEqual(donationTokenMac(donationId, issuedAtSeconds), parts[2])) return false;
  if (issuedAtMs > now.getTime() + 5 * 60 * 1000) return false; // issued in the future
  if (now.getTime() - issuedAtMs > env.DONATION_TOKEN_TTL_DAYS * DAY_MS) return false;
  return !revokedByCutoff(issuedAtMs);
}

/**
 * Secure, time-limited receipt-download link for SMS/WhatsApp delivery
 * (MOBILE_RECEIPT_DELIVERY.security — links must not be permanent).
 * `signDonationAccessToken` above is unsuitable for this: it's a
 * deterministic HMAC of the donationId alone with no expiry, so it never
 * stops working once issued. This is a real JWT with an `exp` claim and its
 * own `type` guard (matching the `DonorTokenPayload` pattern) so it can never
 * be confused with a donor-session or admin token.
 */
export interface ReceiptAccessTokenPayload {
  sub: string; // donation.id
  type: 'receipt';
}

const RECEIPT_TOKEN_TTL = '30d';

export function signReceiptAccessToken(donationId: string): string {
  return jwt.sign(
    { sub: donationId, type: 'receipt' } as ReceiptAccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: RECEIPT_TOKEN_TTL } as SignOptions,
  );
}

/** Returns the donationId if the token is a valid, unexpired receipt token
 * for it; `null` otherwise (invalid signature, wrong type, expired, or
 * doesn't match this donation) — never throws, so callers can treat it as
 * one more token type to try alongside `verifyDonationAccessToken`. */
export function verifyReceiptAccessToken(donationId: string, token: string): boolean {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ReceiptAccessTokenPayload & {
      iat?: number;
    };
    if (payload.type !== 'receipt' || payload.sub !== donationId) return false;
    // Same revocation cutoff as donation tokens (emailed links included).
    return typeof payload.iat === 'number' && !revokedByCutoff(payload.iat * 1000);
  } catch {
    return false;
  }
}
