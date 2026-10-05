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
 */
export function signDonationAccessToken(donationId: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(donationId).digest('hex');
}

export function verifyDonationAccessToken(donationId: string, token: string): boolean {
  const expected = signDonationAccessToken(donationId);
  const bufA = Buffer.from(expected);
  const bufB = Buffer.from(token);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ReceiptAccessTokenPayload;
    return payload.type === 'receipt' && payload.sub === donationId;
  } catch {
    return false;
  }
}
